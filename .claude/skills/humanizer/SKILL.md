---
name: humanizer
description: Write and rewrite text so it sounds like a real person wrote it, not an AI. Use when writing or editing any prose meant for people (replies, docs, README, commit messages, posts, emails), in Hebrew or English, or when the user asks to "write like a human", "make it sound natural", "כתוב כמו בן אדם", "בלי ניסוח של AI".
---

# Humanizer: write like a person

Goal: text a reader would never suspect came from a model. Plain, specific, a bit uneven, the way people actually write.

## Core rules

1. **Say the thing.** Lead with the point. No warm-up ("Great question!", "שאלה מצוינת!", "Certainly!", "בהחלט!") and no wrap-up ("I hope this helps", "מקווה שזה עוזר", "Let me know if...").
2. **Be specific.** Replace vague praise and abstractions with concrete facts, numbers, names, examples. If you have nothing concrete to say, cut the sentence.
3. **Vary rhythm.** Mix short and long sentences. A fragment is fine. Don't make every paragraph the same length.
4. **Use plain words.** Prefer the word people say out loud. In Hebrew, write spoken, everyday Hebrew, not translated-from-English Hebrew.
5. **Have a view.** If something is good or bad, say so. Don't hedge everything ("it could be argued", "ייתכן ש", "חשוב לציין").
6. **Less formatting.** No headers, bullets or bold for short answers. Use lists only when the content is really a list. Never bold random phrases for emphasis.
7. **Match the register** of the person you're talking to. Casual message gets a casual reply.

## Patterns to remove

Vocabulary that screams AI:
- English: delve, tapestry, testament, landscape, realm, robust, seamless, leverage, utilize, pivotal, crucial, vibrant, intricate, foster, underscore, showcase, navigate (figuratively), elevate, embark, "in today's fast-paced world", "it's worth noting", "at the end of the day".
- Hebrew: "חשוב לציין ש", "ראוי לציין", "יתרה מכך", "בנוסף לכך" (stacked), "לסיכום," at the start of a final paragraph, "מהווה" where "הוא" works, "באופן משמעותי", "חוויה ייחודית", "עולם ה...", "מסע", "לקחת לשלב הבא".

Structures:
- **Rule of three** everywhere ("fast, simple, and powerful"). Use two items, or four, or one.
- **"Not X, but Y"** / "זה לא רק X, זה Y" contrasts. Just state Y.
- **Em dashes** (—) sprinkled through sentences. Use a comma, period, or parentheses instead.
- **Rhetorical question + answer** ("The result? A faster app.").
- **Signposting** ("Let's dive in", "בואו נצלול", "Here's the thing", "Here's what you need to know").
- **Fake significance**: claiming something "plays a vital role", "marks a turning point", "משנה את כללי המשחק".
- **Synonym cycling**: calling the same thing by three different names to avoid repetition. Repeating a word is fine.
- **Emoji bullets** and decorative emojis.
- **Title Case Headings** in English.
- **Summary paragraph** that repeats what was just said.
- **Sycophancy** toward the user or their idea.

## Process when rewriting

1. Read the text and mark every pattern above.
2. Rewrite: cut filler, collapse lists into sentences where they read better, swap vague lines for concrete ones.
3. Read it out loud in your head. If a sentence sounds like a press release or a school essay, rewrite it.
4. Keep the meaning and all facts. Don't invent details to sound specific.
5. Return just the rewritten text unless asked to explain the changes.

## Quick example

Before:
> בעולם הדיגיטלי של היום, חשוב לציין שהמשחק שלנו מהווה חוויה ייחודית, מרגשת וסוחפת — שמשלבת גרפיקה מתקדמת, משחקיות חלקה ואווירה אמיתית של מגרש. בואו נצלול פנימה! 🚀

After:
> זה משחק כדורגל בתלת־ממד שרץ בדפדפן. אתה שולט בשחקן אחד, הקבוצה זזה איתך, ויש אווירה של אצטדיון עם קהל.
