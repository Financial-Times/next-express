include n.Makefile

test: unit-test verify

unit-test:
	export FT_NEXT_BACKEND_KEY=test-backend-key; mocha --recursive

run:
	node test/fixtures/app/main.js
