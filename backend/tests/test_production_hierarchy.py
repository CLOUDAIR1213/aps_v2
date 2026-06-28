from types import SimpleNamespace
import unittest

from app.services.production_import_service import get_parent_no
from app.services.production_service import _build_operation_dependencies


def part(no: str, source_row: int | None = None):
    payload = {"no": no}
    if source_row is not None:
        payload["source_row"] = source_row
    return SimpleNamespace(**payload)


def op(operation_id: int, seq_no: int):
    return SimpleNamespace(id=operation_id, seq_no=seq_no)


def dependency_edges(dependencies):
    return {
        (dependency.operation_id, dependency.depends_on_operation_id)
        for dependency in dependencies
    }


class ProductionHierarchyDependencyTests(unittest.TestCase):
    def test_get_parent_no_uses_direct_parent(self):
        self.assertIsNone(get_parent_no("1"))
        self.assertEqual(get_parent_no("1.1"), "1")
        self.assertEqual(get_parent_no("1.1.1"), "1.1")
        self.assertEqual(get_parent_no("2.3.4.5"), "2.3.4")

    def test_two_level_parent_waits_for_all_direct_children(self):
        dependencies, sequence_count, hierarchy_count = _build_operation_dependencies(
            [part("1"), part("1.1"), part("1.2")],
            {
                "1": [op(1, 1), op(2, 2)],
                "1.1": [op(3, 1), op(4, 2)],
                "1.2": [op(5, 1)],
            },
        )

        self.assertEqual(sequence_count, 2)
        self.assertEqual(hierarchy_count, 2)
        self.assertEqual(
            dependency_edges(dependencies),
            {
                (2, 1),
                (4, 3),
                (1, 4),
                (1, 5),
            },
        )

    def test_three_level_hierarchy_waits_bottom_up(self):
        dependencies, sequence_count, hierarchy_count = _build_operation_dependencies(
            [part("1"), part("1.1"), part("1.1.1")],
            {
                "1": [op(10, 1)],
                "1.1": [op(11, 1)],
                "1.1.1": [op(12, 1)],
            },
        )

        self.assertEqual(sequence_count, 0)
        self.assertEqual(hierarchy_count, 2)
        self.assertEqual(dependency_edges(dependencies), {(11, 12), (10, 11)})

    def test_parent_without_operations_passes_child_anchors_upward(self):
        dependencies, sequence_count, hierarchy_count = _build_operation_dependencies(
            [part("1"), part("1.1"), part("1.1.1")],
            {
                "1.1": [op(21, 1)],
                "1.1.1": [op(22, 1)],
            },
        )

        self.assertEqual(sequence_count, 0)
        self.assertEqual(hierarchy_count, 1)
        self.assertEqual(dependency_edges(dependencies), {(21, 22)})

    def test_duplicate_parent_no_skips_ambiguous_hierarchy_edges(self):
        dependencies, sequence_count, hierarchy_count = _build_operation_dependencies(
            [part("1", 2), part("1", 3), part("1.1", 4)],
            {
                2: [op(31, 1)],
                3: [op(32, 1)],
                4: [op(33, 1), op(34, 2)],
            },
        )

        self.assertEqual(sequence_count, 1)
        self.assertEqual(hierarchy_count, 0)
        self.assertEqual(dependency_edges(dependencies), {(34, 33)})


if __name__ == "__main__":
    unittest.main()
