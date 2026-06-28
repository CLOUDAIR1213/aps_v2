import { useEffect, useMemo, useState } from "react";

import { deletePersonnel, getPersonnel, importPersonnel } from "../api/production";
import CompactSummaryStrip from "../components/common/CompactSummaryStrip";
import StatusBadge from "../components/StatusBadge";

const STATUS_LABELS = { active: "在职", disabled: "离职" };

export default function Personnel() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [filterCenter, setFilterCenter] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [deletingPersonId, setDeletingPersonId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPersonnel();
      setPeople(data);
      setError("");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "人员数据加载失败。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImport = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("请先选择排班表文件。");
      return;
    }
    setImporting(true);
    setError("");
    setMessage("");
    try {
      const result = await importPersonnel(file);
      setMessage(
        `导入完成：${result.imported_people} 人、关联 ${result.linked_work_centers} 个工段、${result.links_created} 条关联。`
      );
      setFile(null);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "人员导入失败。");
    } finally {
      setImporting(false);
    }
  };

  const handleDeletePerson = async (person) => {
    if (!window.confirm(`确认删除人员「${person.name}」？关联工段会一并移除。`)) return;
    setDeletingPersonId(person.id);
    setError("");
    setMessage("");
    try {
      await deletePersonnel(person.id);
      setMessage(`人员「${person.name}」已删除。`);
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "人员删除失败。");
    } finally {
      setDeletingPersonId(null);
    }
  };

  const allWorkCenters = useMemo(() => {
    const map = new Map();
    for (const p of people) {
      for (const wc of p.work_centers || []) {
        map.set(wc.id, wc.name);
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [people]);

  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      if (filterCenter) {
        const hasCenter = (p.work_centers || []).some((wc) => String(wc.id) === filterCenter);
        if (!hasCenter) return false;
      }
      if (filterKeyword) {
        const kw = filterKeyword.toLowerCase();
        if (!p.name.toLowerCase().includes(kw) && !p.employee_no.toLowerCase().includes(kw)) {
          return false;
        }
      }
      return true;
    });
  }, [people, filterCenter, filterKeyword]);

  const activeCount = people.filter((p) => p.status === "active").length;
  const grouped = useMemo(() => {
    const map = new Map();
    for (const p of filteredPeople) {
      const centerNames = (p.work_centers || []).map((wc) => wc.name).join("、") || "未分配";
      if (!map.has(centerNames)) map.set(centerNames, []);
      map.get(centerNames).push(p);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredPeople]);

  const cards = [
    { title: "人员总数", value: people.length, meta: `${activeCount} 在职`, accent: "#205c52" },
    { title: "筛选结果", value: filteredPeople.length, meta: filterCenter || filterKeyword ? "已过滤" : "全部", accent: "#2d5d8c" },
    { title: "关联工段", value: allWorkCenters.length, meta: "来自排班表导入", accent: "#b97012" },
  ];

  return (
    <section className="page-grid">
      <CompactSummaryStrip className="master-data-summary-strip" items={cards} loading={loading} />

      <div className="panel compact-page-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">人员导入</h3>
            <p className="panel-subtitle">上传排班表 Excel 导入人员与工段关联。</p>
          </div>
        </div>
        <form className="table-toolbar personnel-import-toolbar" onSubmit={handleImport}>
          <label className="toolbar-field">
            <span>排班表文件</span>
            <input
              className="field-input"
              type="file"
              accept=".xlsm,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="toolbar-actions">
            <button className="button" type="submit" disabled={importing || !file}>
              {importing ? "导入中..." : "导入人员"}
            </button>
          </div>
        </form>
        {message ? <div className="alert success">{message}</div> : null}
        {error ? <div className="alert danger">{error}</div> : null}
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">人员花名册</h3>
            <p className="panel-subtitle">逐人展示关联工段，支持筛选。</p>
          </div>
        </div>

        <div className="table-toolbar personnel-filter-toolbar">
          <label className="toolbar-field">
            <span>按工段筛选</span>
            <select
              className="field-input"
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
            >
              <option value="">全部工段</option>
              {allWorkCenters.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <label className="toolbar-field">
            <span>搜索姓名/工号</span>
            <input
              className="field-input"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="输入关键词"
            />
          </label>
        </div>

        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>工号</th>
                <th>姓名</th>
                <th>状态</th>
                <th>关联工段</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                    {people.length === 0 ? "暂无人员数据，请先导入排班表。" : "无匹配结果。"}
                  </td>
                </tr>
              ) : (
                grouped.map(([centerNames, members]) =>
                  members.map((person) => (
                    <tr key={person.id}>
                      <td>{person.employee_no}</td>
                      <td>
                        <p className="data-primary">{person.name}</p>
                      </td>
                      <td>
                        <StatusBadge tone={person.status === "active" ? "success" : "neutral"}>
                          {STATUS_LABELS[person.status] || person.status}
                        </StatusBadge>
                      </td>
                      <td>
                        <span className="data-secondary">{centerNames}</span>
                      </td>
                      <td>
                        <button
                          className="button small danger"
                          type="button"
                          disabled={deletingPersonId === person.id}
                          onClick={() => handleDeletePerson(person)}
                        >
                          {deletingPersonId === person.id ? "删除中..." : "删除"}
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
