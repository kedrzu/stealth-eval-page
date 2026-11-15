# reCAPTCHA v3 score probe

A static page that requests a reCAPTCHA v3 (score-based) token and writes it into the page, so an eval tool driving a
browser can read it and fetch the score server-side with `createAssessment`. Used to measure how detectable an
automated browser is. The site key is public by design.

Optional query parameter: `?action=<name>` sets the reCAPTCHA action.
