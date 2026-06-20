import { useState } from "react";
import { analyzeJobDescription } from "../services/api.js";

export default function JdAnalyzer() {
  const [jobDescription, setJobDescription] = useState(
    "We need an intern with SQL, Excel, dashboarding, and strong communication skills."
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    const data = await analyzeJobDescription({
      job_title: "Data Analyst Intern",
      job_description: jobDescription,
    });
    setResult(data);
    setLoading(false);
  }

  return (
    <section className="workspace-grid">
      <form className="panel input-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">JD analyzer</p>
        <h2>Paste a job description</h2>
        <p className="helper-text">
          Compare the JD against a fresher analytics profile and get CV improvement ideas.
        </p>
        <label htmlFor="job-description">Job description</label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          rows="12"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Analyzing..." : "Analyze JD"}
        </button>
      </form>

      <div className="panel response-panel jd-result-card">
        {result ? (
          <>
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Result card</p>
                <h2>JD fit analysis</h2>
              </div>
              <div className="score-ring">{result.fit_score}%</div>
            </div>
            <p>{result.summary}</p>
            <div className="two-column-list">
              <div>
                <h3>Must-have skills</h3>
                <div className="tag-list">
                  {result.must_have_skills.map((skill) => (
                    <span className="skill-tag strong" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3>Nice-to-have skills</h3>
                <div className="tag-list">
                  {result.nice_to_have_skills.map((skill) => (
                    <span className="skill-tag" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <h3>CV suggestions</h3>
            <ul className="check-list">
              {result.cv_suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </>
        ) : (
          <div className="empty-state">
            <div className="assistant-avatar large" aria-hidden="true">H</div>
            <h2>Your analysis will appear here</h2>
            <p>Paste a JD to see skills, fit score, and CV suggestions.</p>
          </div>
        )}
      </div>
    </section>
  );
}
