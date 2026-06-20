import { useEffect, useState } from "react";
import { getProfile, saveProfile } from "../services/api.js";

export default function UserProfile() {
  const [profile, setProfile] = useState({
    name: "",
    target_roles: "",
    skills: [],
    location_preference: "",
    availability: "",
    cv_summary: "",
  });
  const [skillText, setSkillText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getProfile().then((data) => {
      setProfile(data);
      setSkillText((data.skills || []).join(", "));
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const updatedProfile = {
      ...profile,
      skills: skillText.split(",").map((skill) => skill.trim()).filter(Boolean),
      target_role: profile.target_roles,
    };
    const data = await saveProfile(updatedProfile);
    setProfile(data.profile);
    setMessage(data.message);
  }

  function updateField(field, value) {
    setProfile((currentProfile) => ({ ...currentProfile, [field]: value }));
  }

  return (
    <section className="workspace-grid profile-layout">
      <form className="panel input-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Profile</p>
        <h2>Career profile</h2>
        <p className="helper-text">Keep this updated so Hana can tailor advice to your goals.</p>
        <label htmlFor="profile-name">Name</label>
        <input
          id="profile-name"
          value={profile.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <label htmlFor="profile-role">Target roles</label>
        <input
          id="profile-role"
          value={profile.target_roles || ""}
          onChange={(event) => updateField("target_roles", event.target.value)}
          placeholder="Data Analyst Intern, Business Analyst Intern"
        />
        <label htmlFor="profile-skills">Skills</label>
        <input
          id="profile-skills"
          value={skillText}
          onChange={(event) => setSkillText(event.target.value)}
          placeholder="Excel, SQL, Python, Power BI"
        />
        <label htmlFor="profile-location">Location preference</label>
        <input
          id="profile-location"
          value={profile.location_preference || ""}
          onChange={(event) => updateField("location_preference", event.target.value)}
          placeholder="Ho Chi Minh City, hybrid, remote"
        />
        <label htmlFor="profile-availability">Availability</label>
        <input
          id="profile-availability"
          value={profile.availability || ""}
          onChange={(event) => updateField("availability", event.target.value)}
          placeholder="Available immediately, part-time internship"
        />
        <label htmlFor="profile-summary">CV summary</label>
        <textarea
          id="profile-summary"
          value={profile.cv_summary || ""}
          onChange={(event) => updateField("cv_summary", event.target.value)}
          rows="5"
          placeholder="Short CV summary for internship applications"
        />
        <button type="submit">Save profile</button>
      </form>

      <div className="panel response-panel profile-card">
        <div className="card-title-row">
          <div>
            <p className="eyebrow">Assistant memory</p>
            <h2>{profile.name || "Student User"}</h2>
          </div>
          <div className="assistant-avatar large" aria-hidden="true">H</div>
        </div>
        <div className="profile-summary-grid">
          <div>
            <span>Target roles</span>
            <strong>{profile.target_roles || "Not set"}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>{profile.location_preference || "Not set"}</strong>
          </div>
          <div>
            <span>Availability</span>
            <strong>{profile.availability || "Not set"}</strong>
          </div>
        </div>
        <h3>Skills</h3>
        <div className="tag-list">
          {(skillText ? skillText.split(",").map((skill) => skill.trim()).filter(Boolean) : []).map(
            (skill) => (
              <span className="skill-tag strong" key={skill}>
                {skill}
              </span>
            )
          )}
        </div>
        <h3>CV summary</h3>
        <p>{profile.cv_summary || "Add a concise summary to guide future responses."}</p>
        <p className="success-message">{message}</p>
      </div>
    </section>
  );
}
