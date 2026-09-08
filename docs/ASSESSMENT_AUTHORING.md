# Reliable Heading, Waypoint, and assessment authoring

These are the calls an MCP client should make. IDs below are returned values; replace them rather than inventing IDs. All write responses include `feedback`: read it before retrying. A `failure` has `persisted:false`; a `warning` saved content but needs review; `success` saved content and has no detected blocker.

## Build and inspect a path

1. Call `ruddur_list_headings` and `ruddur_list_waypoints`. If the user names existing content, search with `ruddur_search_headings` or `ruddur_list_waypoints` query `{ "q": "career" }`, then retrieve the selected object by ID. Never create merely because a search was not performed.

2. Create a Heading. The current creator API accepts imported-heading payloads, so create the Heading with its initial Waypoint definition when possible:

```json
{ "name": "Career reset", "waypoints": [{ "title": "Clarify direction", "description": "Write the next viable direction.", "questions": [] }] }
```

The response contains a Heading ID, its Waypoint IDs, and placements. Record `headingId`, `waypointId`, and each `placementId`.

3. For reusable Waypoints, call `ruddur_create_waypoint`:

```json
{ "body": { "title": "Research three roles", "description": "Compare responsibilities and constraints.", "isPublic": false, "tags": ["career"], "questions": [] } }
```

Then attach it with `ruddur_attach_waypoint`:

```json
{ "pathParams": { "id": "WAYPOINT_ID" }, "body": { "headingId": "HEADING_ID", "placement": { "order": 2, "position": { "x": 440, "y": 220 } } } }
```

`order` is a zero-based placement order. The response contains `placementId`. Call `ruddur_update_waypoint_placement` with `{ "pathParams": { "placementId": "PLACEMENT_ID" }, "body": { "order": 0 } }` to reorder. Verify with `ruddur_get_heading` and `ruddur_get_waypoint`; never assume a list ordering implies the heading placement order.

4. To edit, first retrieve by ID. Send only fields that change:

```json
{ "pathParams": { "id": "WAYPOINT_ID" }, "body": { "description": "Compare three roles by energy, pay, and learning." } }
```

Omitted fields are preserved. Supplying `questions` or `assessmentConfig` replaces that whole field, so retrieve, edit locally, and submit the full intended replacement. `create` is not idempotent. If its response is lost, list/search before retrying. Update retries do not create duplicates, but should follow a read to avoid overwriting another editor's changes.

## Author and review a scored assessment

Assessments are Waypoints. They attach to a Heading through a normal placement. The API accepts `creatorAssessmentConfig` as an MCP alias, but use `assessmentConfig` in new examples.

```json
{
  "body": {
    "title": "Work style check-in",
    "description": "Find the work conditions that support you.",
    "isPublic": false,
    "questions": [
      { "id": "focus", "type": "scale", "prompt": "I can protect focused time.", "min": 1, "max": 5, "step": 1, "required": true, "page": 0 },
      { "id": "energy", "type": "multiple_choice", "prompt": "Which setting restores your energy?", "required": true, "multiSelect": true, "page": 0,
        "options": [
          { "label": "Quiet solo work", "value": "solo", "scores": { "focus": 5, "connection": 1 } },
          { "label": "Collaborating", "value": "team", "scores": { "focus": 2, "connection": 5 } },
          { "label": "A mix", "value": "mix", "scores": { "focus": 3, "connection": 3 } }
        ] },
      { "id": "support", "type": "yes_no", "prompt": "Do you ask for help early?", "required": false, "page": 1 },
      { "id": "reflection", "type": "open_text", "prompt": "What would make work easier this week?", "required": true, "page": 1, "placeholder": "A short reflection" }
    ],
    "assessmentConfig": {
      "kind": "creator-assessment", "schemaVersion": 1, "version": "1.0.0", "status": "draft",
      "title": "Work style check-in", "summary": "Your work-style signals.", "questionCount": 4,
      "pageLabels": ["Signals", "Reflection"],
      "scoring": { "mode": "profile", "scaleMin": 1, "scaleMax": 5,
        "groups": [
          { "id": "focus", "label": "Focus", "questionIds": ["focus", "energy"], "weight": 1, "inverted": false, "lowLabel": "Diffuse", "highLabel": "Protected" },
          { "id": "connection", "label": "Connection", "questionIds": ["energy", "support"], "weight": 2, "inverted": false, "lowLabel": "Independent", "highLabel": "Collaborative" }
        ] },
      "result": { "shape": "profile", "title": "Your work style", "description": "Use your strongest signal to plan the week." },
      "presentation": { "mode": "dimension-cards", "showRawScores": true, "showPercentages": true },
      "publish": { "requiresValidation": true, "allowDraftPreview": true, "reviewRequired": false },
      "persistence": { "target": "metadata", "field": "creatorAssessmentResult" }
    }
  }
}
```

Supported question types are `multiple_choice`, `yes_no`, `scale`, `slider`, `open_text`, `resource`, and `upload`. Questions require non-empty `id`, `type`, and `prompt`. `multiple_choice` requires two or more options with unique non-empty `label` and `value`; `multiSelect:true` makes the website require an array of values. `yes_no` supports `yesLabel` and `noLabel`. `scale` defaults to 1–5 and `slider` to 0–100 in the website; give numeric `min < max` and positive `step` when customized. `open_text` supports `placeholder` and the existing count-limit UI. `resource` displays its media/link; `upload` displays “File uploads coming soon.” The last three types do not score.

Immediately call `ruddur_review_assessment` with the returned Waypoint ID. Its response contains draft questions and config, last published snapshot, every attached Heading/placement and a website `reviewPath`, validation issues, blockers, and a real next preview call. Do not expose it to learners or use it as a submission endpoint.

## Scoring: exact behavior

Ruddur currently calculates all accepted modes (`sum`, `weighted`, `range`, and `profile`) as weighted dimension averages. Use `profile`; the other names are retained for compatibility and return a warning.

For each group: take only answered, scoreable questions in `questionIds`; resolve each score; average them; reverse the average input only if `group.inverted:true`; multiply by `weight` (default 1). `group.maxScore` is `scaleMax × weight`; group percentage is `(unweightedAverage - scaleMin) / (scaleMax - scaleMin) × 100`, clamped to 0–100. Total score is the sum of group scores and total percent is total score divided by total max score. `weight:0` contributes neither score nor maximum. Ties select the first configured group as `topDimension`.

`yes`/`true` scores `scaleMax`; `no`/`false` scores `scaleMin`. Scale and slider numbers clamp to the **scoring** scale, not their question bounds; align bounds with `scaleMin`/`scaleMax`. A multiple-choice option uses `scores[groupId]` when present; otherwise its zero-based option position maps evenly from scoring min to max. Multiple selections average their individual scores. An unanswered question is excluded, including numeric zero only when zero is outside the scoring scale; numeric `0` is a valid answer when the scale includes it. Text/resource/upload answers are excluded. Explicit option scores are not clamped, so use the scoring range.

Worked preview for the example above:

```json
{ "pathParams": { "id": "WAYPOINT_ID" }, "body": { "source": "draft", "answers": { "focus": 4, "energy": ["solo", "team"], "support": "no", "reflection": "Block calendar time." } } }
```

`energy` is `(5 + 2) / 2 = 3.5` for Focus and `(1 + 5) / 2 = 3` for Connection. Focus average is `(4 + 3.5)/2 = 3.75`, score `3.75/5`, 68.8%. Connection average is `(3 + 1)/2 = 2`, weight 2 gives score `4/10`, 25%. Total is `7.75/15 = 51.7%`; Focus is top. Change `support` to `yes`: Connection becomes `(3 + 5)/2 × 2 = 8`, 75%; total `11.75/15 = 78.3%`. Submit `energy: []` and omit optional `support`: Focus is 4/5 (75%), Connection has no score (0/10); preview warns about required energy but remains non-persistent. A tied 50% group result selects the first group listed.

`result.bands` are stored but neither evaluated nor rendered; their boundaries have no effect. `reverseScoredQuestionIds` is also metadata only; set `group.inverted` to reverse every question in that group. The review tool warns about both. Interpret results with group labels, descriptions, `lowLabel`, and `highLabel`.

## States, permissions, and publication

An assessment config is `draft` or `published`. `publish.allowDraftPreview` is stored metadata; the current website preview and MCP diagnostic permit draft preview regardless of it, and both keep it non-persistent. A Heading has `DRAFT`/`PUBLISHED` lifecycle state, and marketplace listing visibility is separate. Publishing a listing snapshots valid assessments attached to that Heading; the learner gets the published snapshot, so later draft edits do not change an in-progress learner’s version. Use `ruddur_review_assessment` to compare them. The MCP only lists tools authorized by scopes. `waypoints.read` can review and preview the authenticated creator's own content; `waypoints.manage` can write. Unauthorized content returns a non-enumerating `NOT_FOUND`; missing scope returns `INSUFFICIENT_SCOPE` with the required scope.

Invalid create/update responses use 400 with `issues[]` entries containing `field`, `code`, and correction. They save nothing. Successful writes return affected ID, changed fields, readiness, defaults/state, retry guidance and suggested next calls. A saved assessment with warnings must be reviewed before publication.
