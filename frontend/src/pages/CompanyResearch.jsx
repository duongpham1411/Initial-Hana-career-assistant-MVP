import { useState } from "react";
import { researchCompany } from "../services/api.js";

export default function CompanyResearch() {
  const [companyName, setCompanyName] = useState("Google");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    const data = await researchCompany({
      company_name: companyName,
      role_interest: "Data Analyst Intern",
    });
    setResult(data);
    setLoading(false);
  }

  return (
    <section className="workspace-grid">
      <form className="panel input-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Company intelligence</p>
        <h2>Research a target company</h2>
        <p className="helper-text">
          Get a quick internship-focused view of what to learn before applying or interviewing.
        </p>
        <label htmlFor="company-name">Company</label>
        <input
          id="company-name"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Example: Google"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Researching..." : "Research company"}
        </button>
      </form>

      <div className="panel response-panel intelligence-card">
        {result ? (
          <>
            <div className="card-title-row">
              <div>
                <p className="eyebrow">Company intelligence card</p>
                <h2>{result.company}</h2>
              </div>
              <div className="score-ring">{result.fit_score}%</div>
            </div>
            <div className="detail-grid">
              <div>
                <span>Industry</span>
                <strong>{result.industry}</strong>
              </div>
              <div>
                <span>Fit score</span>
                <strong>{result.fit_score}% internship fit</strong>
              </div>
              <div>
                <span>Target role</span>
                <strong>{result.role_interest}</strong>
              </div>
              <div>
                <span>Best angle</span>
                <strong>Projects + business impact</strong>
              </div>
            </div>
            <h3>What they do</h3>
            <p>{result.what_they_do || result.summary}</p>

            <div className="highlight-box">
              <span>Quick read</span>
              <p>{result.summary}</p>
            </div>

            <h3>Likely analytics work</h3>
            <ul className="check-list">
              {(result.likely_data_work || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3>CV keywords to include</h3>
            <div className="tag-list">
              {(result.cv_keywords || []).map((keyword) => (
                <span className="skill-tag strong" key={keyword}>
                  {keyword}
                </span>
              ))}
            </div>

            <div className="two-column-list">
              <div>
                <h3>Strengths</h3>
                <ul>
                  {(result.strengths || result.interview_tips || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Risks</h3>
                <ul>
                  {(result.risks || result.what_to_learn || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="two-column-list">
              <div>
                <h3>What to learn before applying</h3>
                <ul>
                  {(result.what_to_learn || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Interview prep</h3>
                <ul>
                  {(result.interview_tips || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <h3>Application plan</h3>
            <ol className="number-list">
              {(result.application_plan || []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>

            <div className="highlight-box">
              <span>Suggested CV angle</span>
              <p>{result.suggested_cv_angle}</p>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="assistant-avatar large" aria-hidden="true">H</div>
            <h2>Company research will appear here</h2>
            <p>Search a company to generate mock industry, fit, risk, and CV positioning notes.</p>
          </div>
        )}
      </div>
    </section>
  );
}
