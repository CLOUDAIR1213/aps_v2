from __future__ import annotations

from io import BytesIO
from typing import Any

from openpyxl import load_workbook

from app.schemas.production import (
    ImportIssue,
    ImportOperationPreview,
    ImportPartPreview,
    ImportPreviewPayload,
)


PRIMARY_SHEET = "焊接件明细"
BASE_COLUMNS = 11
IGNORED_OPERATION_HEADERS = {"", "备注", "备注1", "flag", "计划日期", "完工日期"}
EXTERNAL_WORK_CENTERS = {"钣金外", "加工外", "表面处理"}
ASSEMBLY_JOIN_OPERATIONS = {"拼装", "焊接", "整形"}


def _to_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _to_int(value: Any, default: int = 1) -> int:
    if value in (None, ""):
        return default
    try:
        return max(int(float(value)), 0)
    except (TypeError, ValueError):
        return default


def _to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).strip())
    except ValueError:
        return None


def _is_assembly_no(no: str) -> bool:
    return bool(no) and "." not in no


def _parent_no(no: str) -> str | None:
    if "." not in no:
        return None
    return no.split(".", 1)[0]


async def parse_work_order_workbook(
    content: bytes,
    filename: str,
    mapping_rules: dict[str, dict] | None = None,
) -> ImportPreviewPayload:
    mapping_rules = mapping_rules or {}
    workbook = load_workbook(BytesIO(content), read_only=False, data_only=True, keep_vba=True)
    issues: list[ImportIssue] = []

    if PRIMARY_SHEET not in workbook.sheetnames:
        raise ValueError(f"Workbook must contain sheet '{PRIMARY_SHEET}'.")

    sheet = workbook[PRIMARY_SHEET]
    headers = [_to_text(sheet.cell(1, col).value) for col in range(1, sheet.max_column + 1)]
    operation_columns: list[tuple[int, str, int]] = []

    for col_idx, header in enumerate(headers, start=1):
        if col_idx <= BASE_COLUMNS or header in IGNORED_OPERATION_HEADERS:
            continue
        operation_columns.append((col_idx, header, len(operation_columns) + 1))
        if header not in mapping_rules:
            issues.append(
                ImportIssue(
                    severity="error",
                    column=col_idx,
                    field="work_center",
                    message=f"工序列 '{header}' 尚未配置映射规则，请先在工序映射中配置。",
                )
            )

    parts: list[ImportPartPreview] = []
    operations: list[ImportOperationPreview] = []
    part_operation_counts: dict[str, int] = {}
    part_hours: dict[str, float] = {}
    assembly_nos: set[str] = set()

    for row_idx in range(2, sheet.max_row + 1):
        no = _to_text(sheet.cell(row_idx, 1).value)
        drawing_no = _to_text(sheet.cell(row_idx, 2).value)
        name = _to_text(sheet.cell(row_idx, 3).value)

        if not no and not drawing_no and not name:
            continue
        if not no and drawing_no == "第一行不输入":
            continue
        if not drawing_no:
            issues.append(
                ImportIssue(
                    severity="error",
                    row=row_idx,
                    field="drawing_no",
                    message="图号为空，该行不会生成有效生产任务。",
                )
            )
            continue
        if not no:
            issues.append(
                ImportIssue(
                    severity="error",
                    row=row_idx,
                    field="no",
                    message=f"图号 {drawing_no} 的 NO 为空，无法建立部件层级。",
                )
            )
            continue

        is_assembly = _is_assembly_no(no)
        if is_assembly:
            assembly_nos.add(no)

        part = ImportPartPreview(
            no=no,
            drawing_no=drawing_no,
            name=name or drawing_no,
            parent_no=_parent_no(no),
            material=_to_text(sheet.cell(row_idx, 8).value) or None,
            quantity=_to_int(sheet.cell(row_idx, 7).value, 1),
            source_row=row_idx,
            is_assembly=is_assembly,
            operation_count=0,
            total_hours=0,
        )
        parts.append(part)
        part_operation_counts[no] = 0
        part_hours[no] = 0

        for col_idx, header, seq_no in operation_columns:
            raw_value = sheet.cell(row_idx, col_idx).value
            is_external = mapping_rules.get(header, {}).get("is_external", header in EXTERNAL_WORK_CENTERS)

            if raw_value in (None, ""):
                # External mapped columns: use default duration from work center config
                if is_external and header in mapping_rules:
                    default_h = mapping_rules[header].get("default_duration_hours")
                    if default_h and default_h > 0:
                        operations.append(
                            ImportOperationPreview(
                                part_no=no,
                                drawing_no=drawing_no,
                                part_name=name or drawing_no,
                                work_center_name=header,
                                seq_no=seq_no,
                                duration_hours=round(default_h, 3),
                                source_row=row_idx,
                                source_col=col_idx,
                                is_external=True,
                                mapped=True,
                            )
                        )
                        part_operation_counts[no] += 1
                        part_hours[no] += default_h
                        issues.append(
                            ImportIssue(
                                severity="info",
                                row=row_idx,
                                column=col_idx,
                                field=header,
                                message=f"{drawing_no} 的工序 '{header}' Excel 无工时，已使用工段默认工时 {default_h}h。",
                            )
                        )
                continue

            duration = _to_float(raw_value)
            if duration is None:
                issues.append(
                    ImportIssue(
                        severity="warning",
                        row=row_idx,
                        column=col_idx,
                        field=header,
                        message=f"{drawing_no} 的工序 '{header}' 工时不是数字，已跳过。",
                    )
                )
                continue
            if duration <= 0:
                continue

            operations.append(
                ImportOperationPreview(
                    part_no=no,
                    drawing_no=drawing_no,
                    part_name=name or drawing_no,
                    work_center_name=header,
                    seq_no=seq_no,
                    duration_hours=round(duration, 3),
                    source_row=row_idx,
                    source_col=col_idx,
                    is_external=is_external,
                    mapped=header in mapping_rules,
                )
            )
            part_operation_counts[no] += 1
            part_hours[no] += duration

    for part in parts:
        part.operation_count = part_operation_counts.get(part.no, 0)
        part.total_hours = round(part_hours.get(part.no, 0), 3)
        if part.parent_no and part.parent_no not in assembly_nos:
            issues.append(
                ImportIssue(
                    severity="warning",
                    row=part.source_row,
                    field="parent_no",
                    message=f"子件 {part.no} 未找到上级部件 {part.parent_no}。",
                )
            )

    summary = {
        "part_count": len(parts),
        "assembly_count": len([part for part in parts if part.is_assembly]),
        "child_part_count": len([part for part in parts if not part.is_assembly]),
        "operation_count": len(operations),
        "work_center_count": len({op.work_center_name for op in operations}),
        "total_hours": round(sum(op.duration_hours for op in operations), 3),
        "error_count": len([issue for issue in issues if issue.severity == "error"]),
        "warning_count": len([issue for issue in issues if issue.severity == "warning"]),
    }

    return ImportPreviewPayload(
        source_filename=filename,
        sheet_name=PRIMARY_SHEET,
        parts=parts,
        operations=operations,
        issues=issues,
        summary=summary,
    )
