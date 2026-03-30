import { Link } from 'react-router-dom'

export function ProjectsHubPage() {
  return (
    <div className="projects-hub">
      <h1 className="projects-hub-title">Projects</h1>
      <p className="projects-hub-intro">
        Click on some of our publicly available projects below.
      </p>

      <ul className="projects-cards">
        <li>
          <Link
            className="project-card"
            to="/embed/home-services/parker-electric"
          >
            <span className="project-card-name">Home Services</span>
            <span className="project-card-desc">
              Customer intake chat (Parker Electric). Opens the embed widget.
            </span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
