---
name: course-generator
description: Guides the agent in planning, interviewing, and writing detailed technical art/programming courses and complementary NotebookLM podcast scripts. Use this skill when a user asks to create a new course or write additional lessons/podcast notes.
---

# Course Generator Skill

This skill governs the systematic workflow and styling specifications for writing technical courses and corresponding NotebookLM podcast notes, modeled on the Unity Technical Art, Capture Pipelines, and FishNet courses.

---

## 1. Collaborative Curriculum Development Workflow

To create a new course, you must follow this interactive phase-based workflow. Do not skip phases.

### Phase 1: Intake & Research
1. **Collect Topic & Scope**: The user provides the core topic, a target number of lessons (depth), and a stream-of-thought knowledge dump.
2. **Identify Knowledge Gaps**: Perform deep research on the topic to identify implicit gaps in the user's stream-of-thought dump (e.g., hardware constraints, optimization details, thread limits).
3. **Formulate Planning Document**: Outline the core technical concepts that must be covered to bridge those gaps.

### Phase 2: Interactive Planning (The Interview)
1. **Interview the User**: Run a back-and-forth planning session (recommend the `/grill-me` command to the user if helpful). Ask targeted questions about their specific goals, target platform (e.g., WebGL, VR, mobile), and any specific project scenarios they want as case studies.
2. **Propose Lesson Plan**: Present a complete list of lessons with names and brief summaries of what each will cover.
3. **Obtain Approval**: Wait for the user to approve the syllabus before writing any lessons.

### Phase 3: Incremental Drafting & Steering
1. **Draft In Batches**: Write only **1 or 2 lessons at a time**. 
2. **Maintain the Concurrent Invariant**: For each lesson written, you **MUST** draft both the **HTML lesson file** and the **Markdown podcast notes** concurrently. Do not move on to Lesson N+1 until Lesson N's HTML and podcast files are both finalized and reviewed.
3. **User Audit**: After each batch, present the lessons to the user. Allow them to steer, correct, and audit the technical depth before starting the next batch.

---

## 2. Lesson Document Specifications (HTML)

New lessons must be placed in the `lessons/` directory of the course folder and use the shared `css/style.css` stylesheet. Choose one of two structural patterns:

### Pattern A: Standard/Foundational Lessons (Preferred for Lectures 1-10)
- **Wrapper**: `<div class="container">`
- **Header**: 
  ```html
  <div class="lesson-header">
    <div class="lesson-number">Lesson XX</div>
    <h1>Lesson Title</h1>
    <p class="lesson-subtitle">Brief description of the lesson topic.</p>
  </div>
  ```
- **Sections**: Use `<h2>` for top-level topics (3-6 per lesson) and `<h3>` or `<h4>` for sub-sections.
- **Visuals (ASCII Diagrams)**: Every lesson must include 1-3 detailed ASCII block diagrams wrapped in `<div class="diagram">`. Use box-drawing characters (`┌─┐`, `→`, `│`).
- **Callout Boxes**: Integrate 2-4 `.callout` boxes using these specific classes:
  - `.callout-concept` (🧠 Key Concept) - for core mental models.
  - `.callout-important` (💡 Important) - for design rules or critical requirements.
  - `.callout-warning` (⚠️ Common Pitfall) - for debugging advice/traps.
  - `.callout-tip` (💚 [Project/Job] Relevance) - for practical context matching the user's specific target project (e.g., "WebGL Relevance").
- **Tables**: Use standard `<table>` elements with styled headers for structured comparison tables.
- **Key Takeaways**: Close the lesson with:
  ```html
  <h2>Key Takeaways</h2>
  <ul>
    <li><strong>Key Term</strong>: Short summary.</li>
  </ul>
  ```
- **Navigation**: Include the navigation footer:
  ```html
  <div class="lesson-nav">
    <a href="prev.html"><span class="label">← Previous</span><span class="title">Previous Title</span></a>
    <a href="next.html"><span class="label">Next Lesson →</span><span class="title">Next Title</span></a>
  </div>
  ```

### Pattern B: Applied/Late Lessons (Preferred for Extensions & Advanced Projects)
- **Wrapper**: `<main class="lesson-content">`
- **Header**: Plain `<h1>Lesson XX: Title</h1>`
- **Sections**: Use `<section>` tags. The first section should be `<section class="overview">` acting as a summary card.
- **Comparison Grids**: Replace callout boxes with comparison grids:
  ```html
  <div class="comparison-grid">
    <div class="card good">
      <h3>The Efficient Way</h3>
      <p>...</p>
    </div>
    <div class="card bad">
      <h3>The Slow Way</h3>
      <p>...</p>
    </div>
  </div>
  ```
- **Code Focus**: Focus on complete script samples (e.g., HLSL kernel + C# manager) inside `<div class="code-block"><pre>...</pre></div>`.
- **Takeaways**: Use `<section class="key-takeaways"><h2>Key Takeaways</h2><ol>...</ol></section>`.
- **Navigation**: Use `<footer class="lesson-footer">` matching standard Pattern B links.

---

## 3. Podcast Document Specifications (Markdown)

Podcast notes must be stored in the `notebook_lm_notes/` directory as Markdown (`.md`) files. They are designed as input files for Google NotebookLM to generate audio dialogues.

### General Characteristics
- **Word Count**: Keep files between **500 and 950 words**.
- **Voice & Tone**: Written in the style of an expert university tutorial teacher (TA) helping students digest the professor's lecture notes. It is supportive, enthusiastic, highly practical, and clear.
- **Dialogue-Ready Prose**: Write in paragraph form, but use conversational transitions and rhetorical questions that naturally translate into a dynamic, two-host audio conversation.
  * *Example*: "Let's start with a question that seems almost too basic...", "Now here's the catch...", "This is where the magic happens."

### Pedagogical Invariants
1. **Analogy-Heavy**: Every script must use at least one strong, intuitive real-world analogy to explain a complex technical concept.
   * *Examples*: A painter changing brushes for draw calls; a roll of painter's tape for the stencil buffer mask; a dumb packet bouncer for a relay connection.
2. **Concept to Mechanic Pipeline**: Start with a high-level conceptual description ("What is a shader?"), then map it directly to code implementation details (e.g., "In your C# code, you call `SetTexture`..."). Never read lines of code verbatim, but explain exactly what the API commands do.
3. **Project Relevance**: Tie the concepts to the user's specific project or deployment target (e.g., explaining why WebGL's single-threaded nature in browser environments means main-thread bloat freezes the entire application).

### Markdown Structure
```markdown
# Lesson XX: Title

## The Big Picture
[A conversational opening hook connecting the concept to a real-world problem or everyday scenario]

## [Sub-Topic 1]
[Conceptual explanation + bolded terms + core analogy]

## [Sub-Topic 2]
[Deeper mechanics, API interactions, and code behavior]

## [Sub-Topic 3 - Target Project/Context Relevance]
[Specific details about how this affects the target project, platform limits, or common interview questions]

## Key Takeaways
1. **Takeaway 1**: Concise summary.
2. **Takeaway 2**: Concise summary.
3. **Takeaway 3**: Concise summary.
```

---

## 4. Cheat Sheet Specifications (HTML)

A course must include a single, consolidated **Cheat Sheet** saved as `cheatsheet.html` in the root of the course folder. This serves as an interview cram sheet.

### General Characteristics
- **Purpose**: To provide a highly dense, scannable overview of all lessons in the course. It should contain enough technical details, definitions, and code syntax that a student could study just this sheet and pass a technical interview.
- **Layout**: Uses a compact, multi-column grid layout (`.cheat-grid` and `.cheat-section`) with internal custom styling.
- **Printability**: Includes print-friendly styles (`@media print`) that remove navigation bars and ensure clear print-outs.

### CSS Styles (Embedded `<style>` in `<head>`)
```css
.cheat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.cheat-section {
  margin: 0;
}

.cheat-section h3 {
  font-size: 1rem;
  margin-bottom: 0.75rem;
  color: var(--accent-blue);
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.3rem;
}

.cheat-section ul {
  margin: 0;
  padding-left: 1.25rem;
}

.cheat-section li {
  font-size: 0.9rem;
  margin-bottom: 0.3rem;
  line-height: 1.5;
}

.mini-table {
  font-size: 0.85rem;
  margin: 1rem 0;
}

.mini-table th, .mini-table td {
  padding: 0.4rem 0.6rem;
}

.quick-ref {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  font-size: 0.9rem;
  border-left: 4px solid var(--accent-orange);
}

@media print {
  body { background: white; color: black; }
  .nav { display: none; }
  .cheat-section { break-inside: avoid; }
}
```

### HTML Structure
- **Index Link**: Add a link to `cheatsheet.html` in the main nav bar of both `index.html` and individual lessons.
- **Header**: Includes `<h1>Master Cheat Sheet</h1>` and subtitle.
- **Content Blocks**: Organize content by lessons using `<h2>` headers, followed by `.quick-ref` one-liners, `.cheat-grid` columns, and `.mini-table` elements for comparisons.

---

## 5. Interactive Simulation Building (Bonus Capability)

For complex spatial, rendering, or network pipeline topics, you may suggest building interactive simulations (similar to the Capture Pipeline Simulator). These should:
1. Use **vanilla HTML/JS/CSS** for zero-dependency execution in browser environments.
2. Be styled using the course's dark theme color palette.
3. Feature interactive inputs (e.g., slider adjustments, button triggers) to animate and visually trace packets, render steps, or CPU/GPU state changes.
4. Only be built once the corresponding lesson course notes have been fully written and approved.

