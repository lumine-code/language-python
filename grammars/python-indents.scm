
; REINDENT EXISTING STRUCTURE
; ==========================
; A previous statement's indentation cannot identify the end of a Python
; block. During explicit reindent, retain the structure already parsed. These
; rules deliberately do not run while typing, pasting, or inserting Enter.
((string) @preserve
  (#is? indent.reindent true)
  (#is-not? indent.matchesCurrentRow startPosition)
  (#set! indent.force true))

((comment) @preserve
  (#is? indent.reindent true)
  (#is? indent.matchesCurrentRow startPosition)
  (#set! indent.force true))

((_) @none
  (#is? test.typeAt "parent module")
  (#is-not? test.typeAt "self comment ERROR line_continuation")
  (#is? indent.reindent true)
  (#is? indent.matchesCurrentRow startPosition)
  (#set! indent.force true))

((_) @match
  (#is? test.typeAt "parent block")
  (#is-not? test.typeAt "self comment ERROR line_continuation")
  (#is? indent.reindent true)
  (#is? indent.matchesCurrentRow startPosition)
  (#set! indent.match parent.parent.startPosition)
  (#set! indent.offset 1)
  (#set! indent.force true))

([(elif_clause) (else_clause) (except_clause) (finally_clause)] @match
  (#is? indent.reindent true)
  (#is? indent.matchesCurrentRow startPosition)
  (#set! indent.match parent.startPosition)
  (#set! indent.force true))

((case_clause) @match
  (#is? indent.reindent true)
  (#is? indent.matchesCurrentRow startPosition)
  (#set! indent.match parent.parent.startPosition)
  (#set! indent.offset 1)
  (#set! indent.force true))

; IGNORE BLOCK-STARTING COLONS BEFORE ONE-LINERS
; ==============================================

; Now that we've done that, all block-starting colons that have their
; consequence block start and end on the same line should be filtered out.
;
; We also test for `lastTextOnRow` to ensure we're not followed by an _empty_
; consequence block, which is surprisingly common. Probably a bug, but it's got
; to be worked around in the meantime.
;
; We check for adjacency between the `:` and the `block` because otherwise we
; might incorrectly match cases like
;
;     if 2 > 1: # some comment
;
; since those comments can also be followed by an empty `block` node on the same
; line.
;
(if_statement
  ":" @_IGNORE_
  .
  consequence: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(elif_clause
  ":" @_IGNORE_
  .
  consequence: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(else_clause
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(match_statement
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(case_clause
  ":" @_IGNORE_
  .
  consequence: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(while_statement
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(for_statement
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(try_statement
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(except_clause
  ":" @_IGNORE_
  .
  (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(with_statement
  ":" @_IGNORE_
  .
  (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(finally_clause
  ":" @_IGNORE_
  .
  (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

; Special case for try/except statements, since they don't seem to be valid
; until they're fully intact. If we don't do this, `except` doesn't dedent.
;
; This is like the `elif`/`else` problem below, but it's trickier because an
; identifier could plausibly begin with the string `except` and we don't want
; to make an across-the-board assumption.
(ERROR
  "try"
  ":" @indent
  (block
    (identifier) @dedent
    (#eq? @dedent "except")
  )
)

(function_definition
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)

(class_definition
  ":" @_IGNORE_
  .
  body: (block)
  (#is-not? test.lastTextOnRow)
  (#is? test.startsOnSameRowAs "nextSibling.endPosition")
  (#set! capture.final)
)


; Only a recognized suite header may indent. Incomplete annotations, slices,
; dictionaries and malformed expressions are ambiguous and keep their level.
((":" @indent)
  (#is? test.childOfType "if_statement elif_clause else_clause match_statement case_clause while_statement for_statement try_statement except_clause finally_clause with_statement function_definition class_definition"))

; MISCELLANEOUS
; =============

; Exact branch keywords can be recovered before the parser recognizes a clause.
; Never match a prefix of an ordinary identifier such as `elsewhere`.
((identifier) @dedent (#match? @dedent "^(elif|else)$"))

((ERROR) @dedent (#match? @dedent "^(elif|else)$"))

; Likewise, typing `case` at the beginning of a line within a match block — in
; cases where it's interpreted as an identifier — strongly suggests that we
; should dedent one level so it's properly recognized as a new `case` keyword.
(
  (identifier) @dedent
  (#eq? @dedent "case")
  (#is? test.descendantOfType "case_clause")
)


; All instances of brackets/braces should be indented if they span multiple
; lines.
["(" "[" "{"] @indent
[")" "]" "}"] @dedent
