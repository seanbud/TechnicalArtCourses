# Course Template

This directory contains a standalone starter kit for building a new technical course.

## Structure

*   **`index.html`**: The main landing page for the course.
*   **`css/`**: Contains `style.css`, which handles all visual styling (dark mode, layout, typography).
*   **`lessons/`**: Stores individual HTML lesson files.
*   **`notebook_lm_notes/`**: Stores Markdown files used to generate audio podcasts via Google NotebookLM.

## How to Use

1.  **Copy this directory** to a new location and rename it (e.g., `MyNewCourse`).
2.  **Edit `index.html`** to update the course title and description.
3.  **Create new lessons**:
    *   Duplicate `lessons/01-template.html`.
    *   Rename it (e.g., `01-intro.html`).
    *   Update the content.
    *   Add a link to it in `index.html`.
4.  **Create audio notes**:
    *   Duplicate `notebook_lm_notes/01-template.md`.
    *   Write your notes in a conversational style.
    *   Upload these MD files to NotebookLM to generate audio.

## Styling

The CSS is designed to be minimal and dark-mode by default. It uses CSS variables for easy theming. You can modify colors in `css/style.css` under the `:root` selector.
