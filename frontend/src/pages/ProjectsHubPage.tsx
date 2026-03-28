import { Link } from 'react-router-dom'

export function ProjectsHubPage() {
  return (
    <div className="projects-hub">
      <h1 className="projects-hub-title">Projects</h1>
      <p className="projects-hub-intro">
        Signed-in experiments. Promote any of these to a public page or a
        separate deploy when you are ready.
      </p>
      <ul className="projects-cards">
        <li>
          <Link className="project-card" to="/projects/home-services-app">
            <span className="project-card-name">Home Services App</span>
            <span className="project-card-desc">
              First side project — notes and API smoke test.
            </span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
