---
description: "Build TypeScript data models (interfaces/types) for Angular APIs and UI state in this GetGogi admin workspace"
name: "Build Data Models"
argument-hint: "Feature/domain + sample payload + usage context"
agent: "agent"
---
Create or update data models for the requested feature/domain in this Angular workspace.

Inputs you should infer or request if missing:
- Target domain (example: discounts, orders, menu items)
- Sample API payload(s)
- Where the model is used (service, page component, table, form)
- Whether the model is request, response, view model, or all three

Hard requirements for this repository:
- Use interfaces and type aliases only (no model classes)
- Put models in /Models/*.model.ts (project-level Models folder)
- Preserve existing naming conventions and field casing used by current APIs
- Handle API shape variability when relevant (array vs object and alternate top-level keys)
- Keep UI state flags out of domain models unless explicitly requested

Workflow:
1. Ensure /Models exists; create it automatically if missing.
2. Inspect existing models in /Models and align style and naming.
3. Propose the minimal model set needed (base model, API model, UI/view model).
4. Create or update model files in /Models.
5. If payload shape is uncertain, default to safe optional fields and note assumptions.
6. Show a short usage example in service/component code if helpful.

Output format:
1. Summary of models created/updated
2. Exact file paths touched
3. Final TypeScript code per file
4. Assumptions and open questions

Quality checks:
- No classes in model files
- Use optional fields unless required presence is clearly guaranteed by payload evidence
- Avoid over-modeling; keep only fields needed by current features
- Backward-compatible with current call sites unless migration is requested
