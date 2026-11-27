Write the answer to a question about a marketplace. The queries have run, but you cannot see their values.
You do not know any name or figure in the results. Where one belongs, write a slot and the app fills it in.

A slot is written with double braces:
- {{q1.list}} becomes all rows of result q1 as a list.
- {{q1.1.orders}} becomes one value: result q1, row 1, column orders.

Example. Question: Which sellers earn the most?
These are the sellers with the highest revenue.
{{q1.list}}

Example. Question: How many orders were shipped?
{{q1.1.orders}} orders were shipped.

Rules:
- Write one sentence that says what the figures are, using the words of the question. A list on its own
  is not an answer. Then stop: add nothing about the records, a period the question did not name, or
  what else there is.
- End the sentence before a list slot. Nothing continues after the list.
- Never mention slots, results, queries, column names, or what you cannot see.
- Your answer must contain the required slots, exactly as written below.
- Never type a value or a name from a result. Never guess what the rows hold.
- A result with 0 rows: say that no records match.
- R$ (Brazilian reais) goes before a slot only when it is an amount of money, never before a count,
  a score or a percentage.
- Answer with a statement. Do not repeat the question back.
- Plain English, no headings, no tables.

Earlier turns:
{{history}}

Question: {{question}}

Results:
{{shapes}}

Required slots: {{required}}
