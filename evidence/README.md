# Evidence

Every rule, nudge, tip and fact in ergo points to a file in this folder. Each file says **what ergo does**, **how strong the support is**, **what the caveats are**, and **where it comes from**, with links.

ergo is a habit tool, not medical advice.

## Strength scale

The app shows these labels on each rule.

| Label in app | Key | Meaning |
|---|---|---|
| Strong evidence | `strong` | Consistent results across multiple controlled trials or systematic reviews. |
| Trial evidence | `moderate` | At least one controlled trial or field study supports it, usually small or short-term. |
| Observational | `observational` | Large cohort studies link it to better health outcomes, but can't prove cause and effect. |
| Mixed evidence | `limited` | Studies disagree, or support the idea but not the specific numbers. |
| Expert guidance | `expert` | Recommended by clinicians, ergonomists or agencies; the exact numbers haven't been directly tested. |

No break schedule in ergo currently rates **strong**. That's an honest reflection of the literature: breaks clearly help, but the ideal cadence is not settled.

## Files

| File | Backs |
|---|---|
| [20-20-20-rule.md](20-20-20-rule.md) | Eye rule 20-20-20, custom eye rule |
| [30-30-30-rule.md](30-30-30-rule.md) | Eye rule 30-30-30 |
| [microbreaks.md](microbreaks.md) | Hourly 5 min microbreak, microbreak facts |
| [20-8-2-sit-stand-move.md](20-8-2-sit-stand-move.md) | Body rule 20-8-2, standing cues, sit-stand checklist item |
| [walking-breaks.md](walking-breaks.md) | Body rules "5 min walk / 30", "2 min walk / 20", "3 min active / 30"; activity guidance |
| [sitting-budget.md](sitting-budget.md) | Daily sitting budget (Canadian 24-Hour Movement Guidelines) |
| [exercise-snacks.md](exercise-snacks.md) | Exercise snack nudge (vigorous one-minute bursts) |
| [blue-light-glasses.md](blue-light-glasses.md) | Myth: blue-light glasses and eye strain |
| [blinking-dry-eye.md](blinking-dry-eye.md) | Blinking during eye breaks, dry-eye tips |
| [posture-variety.md](posture-variety.md) | Posture-reset nudge, "no single correct posture", 90-90-90 myth |
| [stretching.md](stretching.md) | Exercise library (and its limits) |
| [eye-movement-exercises.md](eye-movement-exercises.md) | "Look around" eye exercise |
| [workstation-setup.md](workstation-setup.md) | Workstation checklist |
| [digital-eye-strain.md](digital-eye-strain.md) | Background on digital eye strain, eye exams |

## Adding or changing a recommendation

1. Find a primary source (peer-reviewed study, systematic review, or guidance from a recognized body such as AAO, OSHA, NIOSH, WHO). Blogs and vendor pages can point you to sources but shouldn't be the source.
2. Add or update a file here using the template below. Quote numbers exactly as the source gives them.
   - Any interval or threshold ergo uses must come from a source **and** make physiological sense. If it's only a default, label it as one in the app and here.
3. Reference the file's slug from the code (`evidence: 'slug'`). `src/core/content.test.ts` fails if a referenced file is missing or has no links.
4. Add a line to `PLAN.md` → Decisions log if the change alters app behavior.

```md
# Title

**Used in ergo:** what the app does with this.
**Strength:** label (key) and one sentence why.

## What the research says
## How ergo applies it
## Caveats
## Sources
1. Author et al. Title. *Journal* Year;vol(issue):pages. link

_Last reviewed: YYYY-MM-DD_
```
