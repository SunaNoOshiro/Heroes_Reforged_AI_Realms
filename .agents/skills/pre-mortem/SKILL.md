---
name: pre-mortem  
description: "Ejecuta un premortem sobre cualquier plan, lanzamiento, producto, contratación, estrategia o decisión. Asume que ya falló 6 meses después y trabaja hacia atrás para encontrar todos los motivos. Produce un plan revisado con los puntos ciegos expuestos. DISPARADORES OBLIGATORIOS: 'premortem esto', 'premortem mi', 'ejecuta un premortem', 'qué podría matar esto', 'prueba de estrés este plan', 'qué me estoy perdiendo aquí', 'encuentra los puntos ciegos'. DISPARADORES FUERTES: 'qué podría salir mal', 'me estoy perdiendo algo', 'hazle agujeros a esto', 'dónde va a romperse esto', 'abogado del diablo'. NO disparar en solicitudes simples de retroalimentación, preguntas factuales o solicitudes al Consejo LLM. SÍ disparar cuando alguien tiene un plan o compromiso donde el coste de equivocarse es alto."  
---
# Premortem

A premortem is the opposite of a postmortem. Instead of figuring out what went wrong after something fails, you imagine that it already failed and work backward to discover why before you begin.

The method comes from psychologist Gary Klein. He published it in Harvard Business Review. Daniel Kahneman (the Nobel Prize–winning psychologist behind *Thinking, Fast and Slow*) called it his most valuable decision-making technique. Companies like Google, Goldman Sachs, and Procter & Gamble use it before major decisions.

The key idea: when you ask people “what could go wrong?” they give cautious and vague answers. When you say “this already failed — tell me why,” the brain switches into narrative mode and generates far more specific, creative, and honest reasons. Researchers at Wharton and Cornell called this “prospective hindsight” and found that it significantly improves the ability to identify causes of future outcomes.

Why this matters for AI-assisted decision making: Claude tends toward helpful and optimistic responses. If you ask “is this a good plan?” it will search for reasons to say yes. A premortem breaks this pattern by forcing the framing into “this is dead — explain how it died.” Claude stops searching for reasons the plan will succeed and starts explaining how it collapsed.

---

# When to Run a Premortem

Good targets for a premortem:
- A product or feature you are about to build
- A launch plan with money or reputation at stake
- A pricing or business model change
- A hiring decision
- A strategy or positioning pivot
- A partnership or deal you are evaluating
- Any commitment where the cost of being wrong is high

Bad targets for a premortem:
- Vague ideas without a concrete plan yet
- Questions with a single correct answer
- Creative feedback requests on a draft
- Decisions that are already irreversible

---

# Context Collection (Minimum Necessary)

A premortem is only as good as the context behind it. Vague input creates vague failure scenarios.

Before running the premortem, you need three things:

1. **What is it?**
   A clear understanding of the plan, launch, product, strategy, or decision.

2. **Who is it for / who is affected?**
   The audience, customers, stakeholders, or team.

3. **What does success look like?**
   The expected outcome. Failure is defined by reversing success.

If any of these are missing, ask the user only for the most important missing piece.

Example questions:
- “What exactly are you about to launch/build/decide?”
- “Who is this for?”
- “What would success look like?”

The goal is to gather only the minimum viable context.

---

# Premortem Workflow

## Step 1 — Set the Frame

Explicitly establish the premortem framing:

> “Okay, I have enough context. Let’s run the premortem. The premise is: 6 months have passed. The plan has failed. It’s over. We are looking backward to understand what went wrong.”

This framing changes the model from “evaluate this plan” into “explain how this failed.”

---

## Step 2 — Generate Raw Failure Reasons

Run a complete failure analysis:

> “This plan failed 6 months later. Generate every genuine reason it could have died. Be exhaustive. Be specific. Ground each reason in the actual details of the plan. Do not stop early.”

Each failure reason should:
- Be specific to this plan
- Be grounded in real details
- Represent a genuine threat

Avoid generic business advice.

---

## Step 3 — Deep Analysis Agents

Take every failure reason and analyze it independently in parallel.

### Sub-Agent Prompt Template

```text
You are an investigator in a premortem analysis.

The plan:
---
[full context]
---

PREMORTEM FRAME:
Six months have passed. This plan failed.

YOUR ASSIGNED FAILURE REASON:
[specific failure reason]

Your job is to deeply analyze this failure.

Output:

1. FAILURE STORY
Write a realistic 2–3 paragraph narrative explaining how this failure unfolded.

2. UNDERLYING ASSUMPTION
Identify the single assumption that made this failure possible.

3. EARLY WARNING SIGNS
Provide 1–2 measurable or observable signals that this failure mode is beginning.

Keep total response under 300 words.
Be direct.
Do not soften the analysis.
```

## Step 4 — Synthesis

After all analyses are complete, generate a synthesis report.

# PREMORTEM REPORT

## 1. Most Likely Failure
Which failure scenario is most probable and why?

## 2. Most Dangerous Failure
Which failure would cause the greatest damage if it happened?

## 3. Hidden Assumption
What is the most important assumption the user is making without questioning it?

## 4. Revised Plan
What concrete changes would make the plan more resilient?

Every recommendation should directly map to a failure scenario.

## 5. Pre-Launch Checklist
3–5 concrete checks, validations, or tests the user should complete before execution.

---

# HTML Report Generation

Generate a self-contained visual HTML report:

Filename:
`premortem-report-[timestamp].html`

Requirements:
- Dark theme (#0a0e1a or similar)
- Clean typography
- Highly scannable layout
- Prominent synthesis section at the top
- One visual card per failure mode
- Distinct accent colors for each card
- Severity/probability indicators
- Grid or dashboard layout for all failure analyses
- Footer with timestamp and premortem target

After generation, open the HTML file.

---

# Transcript Saving

Save the full transcript as:

`premortem-transcript-[timestamp].md`

Include:
- Context gathered
- Raw failure reasons
- All deep analyses
- Full synthesis

---

# Output Files

```text
premortem-report-[timestamp].html
premortem-transcript-[timestamp].md
```

The HTML report is the primary deliverable.
The transcript is the detailed reference.

Also provide a concise chat summary:
- Most likely failure
- Hidden assumption
- Most important revision

Maximum: 3 sentences.

---

# Example Premortem

## User Input

> “Premortem this: I’m about to launch a $297 live workshop about using Claude Cowork for marketing teams. 50 seats. Target audience: marketing directors at 10–50 person companies.”

## Raw Failure Reasons

1. Marketing directors require approval for professional development spending, creating friction.
2. The pitch is too tool-centric in a market still uncertain about AI adoption.
3. Actual buyers are solopreneurs rather than team leads.
4. Demo environment setup takes much longer than expected.
5. Testimonials become irrelevant if the wrong audience joins.
6. Revenue ceiling may not justify preparation time.

## Synthesis

- Most likely failure: audience mismatch.
- Most dangerous failure: attracting the wrong customer segment.
- Hidden assumption: the audience identifies as a coherent market segment.
- Revised plan: run a low-cost pilot session first to validate audience.

---

# Important Notes

- Always run failure analyses in parallel.
- Always explicitly establish the premortem framing.
- Be exhaustive without padding.
- The synthesis is the real product.
- Do not soften critical risks.
- Recommendations must be concrete and executable.
- Respect the minimum context threshold.
- A premortem is different from general advisory or brainstorming.