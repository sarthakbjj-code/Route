# Project Overview

This is the Route project repository, a GitHub Pages site for deployment of static content.

# Tech Stack

- Static HTML/CSS/JavaScript
- GitHub Pages for hosting
- GitHub Actions for automated deployment

# Repository Structure

- `.github/workflows/` - Contains GitHub Actions workflow files
- Root directory contains static content deployed to GitHub Pages

# Coding Standards

- Use clear, descriptive file and directory names
- Follow standard HTML5, CSS3, and modern JavaScript (ES6+) conventions
- Maintain consistent indentation (2 spaces preferred)
- Keep files organized and properly structured

# GitHub Actions

- The `static.yml` workflow handles deployment to GitHub Pages
- Workflow triggers on pushes to the `main` branch
- Manual workflow dispatch is also supported
- The workflow deploys the entire repository to GitHub Pages

# Deployment

- All content in the repository root is deployed to GitHub Pages
- Changes pushed to `main` branch trigger automatic deployment
- GitHub Pages URL is available after deployment completes

# Best Practices

- Test static content locally before pushing to main
- Keep the repository clean and well-organized
- Document any new features or pages in the README
- Ensure all links and resources are correctly referenced
- Optimize images and assets for web delivery

# Security

- Never commit sensitive information or credentials
- Validate any external resources or scripts
- Keep dependencies and actions up to date

# Additional Guidance

- When adding new pages, ensure they are properly linked in navigation
- Maintain consistency in styling across all pages
- Consider mobile responsiveness for all content
- Use semantic HTML for better accessibility
