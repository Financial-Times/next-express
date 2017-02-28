/*global it, describe, beforeEach, before, after*/
const request = require('supertest');

// stub the setup api calls
const fetchMock = require('fetch-mock');
const expect = require('chai').expect;

let app;
if (process.env.FT_NEXT_BACKEND_KEY) {

	describe('simple app', function () {

		before(() => {

			fetchMock
				.mock('http://ft-next-health-eu.herokuapp.com/failure-simulation-config', {failures: []})
				.catch(200);

			app = require('../fixtures/app/main');

			fetchMock.restore();
		});

		describe('backend access', function () {
			before(function () {
				process.env.NODE_ENV = 'production';
			});

			after(function () {
				process.env.NODE_ENV = '';
			});

			it('should 401 for arbitrary route without any authentication in production', function (done) {
				request(app)
					.get('/')
					.expect('FT-Backend-Authentication', /false/)
					.end((err, res) => {
						// console.log(res);
						expect(res.status).to.equal(401)
						expect(res.text).to.equal('Invalid Backend Authentication')
						done()
					});
			});

			it('should 401 for arbitrary route with incorrect backend key & no whitelisted IP address in production', function (done) {
				request(app)
					.get('/')
					.set('FT-Next-Backend-Key', 'as-if')
					.expect('ft-backend-authentication', /false/)
					.end((err, res) => {
						expect(res.status).to.equal(401)
						expect(res.text).to.equal('Invalid Backend Authentication')
						done()
					});
			});

			it('should 401 for arbitrary route with incorrect old backend access key & no whitelisted IP address in production', function (done) {
				request(app)
					.get('/')
					.set('FT-Next-Backend-Key-old', 'as-if')
					.expect('ft-backend-authentication', /false/)
					.end((err, res) => {
						expect(res.status).to.equal(401)
						expect(res.text).to.equal('Invalid Backend Authentication')
						done()
					});
			});

			it('should allow double-underscorey routes through without any authentication', function (done) {
				request(app)
					.get('/__about')
					.expect(200, done);
			});

			it('should accept any request with backend access key', function (done) {
				request(app)
					.get('/')
					.set('FT-Next-Backend-Key', 'test-backend-key')
					.expect('FT-Backend-Authentication', /true/)
					.expect(200, done);
			});

			it('accepts any request with an older access key (1 older)', function (done) {
				request(app)
					.get('/')
					.set('FT-Next-Backend-Key', 'test-backend-key-old')
					.expect('FT-Backend-Authentication', /true/)
					.expect(200, done);
			});

			it('should accept any request with backend access key in \'old\' header', function (done) {
				request(app)
					.get('/')
					.set('FT-Next-Backend-Key-Old', 'test-backend-key')
					.expect('FT-Backend-Authentication', /true/)
					.expect(200, done);
			});

			it('accepts any request with an older access key in \'old\' header (1 older)', function (done) {
				request(app)
					.get('/')
					.set('FT-Next-Backend-Key-Old', 'test-backend-key-old')
					.expect('FT-Backend-Authentication', /true/)
					.expect(200, done);
			});

		});
	});
}
