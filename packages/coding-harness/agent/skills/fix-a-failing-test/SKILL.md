---
name: fix-a-failing-test
description: Steps for making a failing test pass by changing the code it tests, not the test.
---

1. Run the check with bash, for example `bun test ./src`, and read the first failure in full.
2. Note the test's name, the value it expected and the value it got.
3. Open the test file and find that test. Read what it calls and with which input.
4. Open the code it calls. Find the line that produced the wrong value.
5. Change that code so it returns the expected value. Leave the test as it is: the test is the definition of done.
6. Run the check again. If a different test now fails, go back to step 2 with that one.
7. When every test passes, call done with a short summary of the change.
