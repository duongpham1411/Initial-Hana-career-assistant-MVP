import { useEffect, useState } from "react";
import { addTrackerItem, getTrackerItems } from "../services/api.js";

export default function JobTracker() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    company: "Acme Analytics",
    role: "Data Analyst Intern",
    status: "Interested",
    fit_score: 82,
    notes: "Apply this week.",
  });

  useEffect(() => {
    getTrackerItems().then((data) => setItems(data.items));
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const data = await addTrackerItem({
      ...form,
      fit_score: Number(form.fit_score) || 0,
    });
    setItems((currentItems) => [...currentItems, data.item]);
  }

  function updateField(field, value) {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  }

  return (
    <section className="workspace-grid tracker-layout">
      <form className="panel input-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Pipeline</p>
        <h2>Add saved company</h2>
        <p className="helper-text">Track internship targets and keep fit scores visible.</p>
        <label htmlFor="tracker-company">Company</label>
        <input
          id="tracker-company"
          value={form.company}
          onChange={(event) => updateField("company", event.target.value)}
        />
        <label htmlFor="tracker-role">Role</label>
        <input
          id="tracker-role"
          value={form.role}
          onChange={(event) => updateField("role", event.target.value)}
        />
        <label htmlFor="tracker-status">Status</label>
        <select
          id="tracker-status"
          value={form.status}
          onChange={(event) => updateField("status", event.target.value)}
        >
          <option>Interested</option>
          <option>Applied</option>
          <option>Interviewing</option>
          <option>Rejected</option>
        </select>
        <label htmlFor="tracker-fit">Fit score</label>
        <input
          id="tracker-fit"
          max="100"
          min="0"
          type="number"
          value={form.fit_score}
          onChange={(event) => updateField("fit_score", event.target.value)}
        />
        <label htmlFor="tracker-notes">Notes</label>
        <textarea
          id="tracker-notes"
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows="4"
        />
        <button type="submit">Save company</button>
      </form>

      <div className="panel response-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Saved companies</p>
            <h2>Application tracker</h2>
          </div>
          <span className="soft-badge">{items.length} saved</span>
        </div>
        <div className="tracker-list">
          {items.map((item, index) => (
            <article className="tracker-row" key={`${item.company}-${item.role}-${index}`}>
              <div>
                <strong>{item.company}</strong>
                <span>{item.role}</span>
                <p>{item.notes}</p>
              </div>
              <span className={`status-tag ${item.status.toLowerCase()}`}>{item.status}</span>
              <div className="fit-score">
                <strong>{item.fit_score || 70}%</strong>
                <span>Fit</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
