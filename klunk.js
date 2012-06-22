/**
 * Author: Bijou Trouvaille
 * Created using JetBrains PhpStorm
 * Date: 6/19/12
 * Time: 10:23 PM
 */

(function (root, exports) {

	/*
	* #toc TABLE OF CONTENTS
	* #run runSuite, runSpec, etc...
	* #descriptors describe, it, beforeEach, etc...
	* #report reportSuite, reportSpec, etc...
	* #underscore utility
	* #expect method
	* #exports - thank you klunk
	* */

	var klunk = {

		top: null /* top suite */,
		options: {
			autorun: false,
			color: true,
			serial: null,
			timeout: null,
			report: {
				passed: false
			}
		},
		init : function ( ) {
			klunk.suite = klunk.top = klunk.newSuite();
		},
		/*
		* #run
		* */
		run : function ( cb ) { /* run everything */
			klunk.runSuite ( klunk.top, function() {
				klunk.reportSuite ( klunk.top );
				cb && cb ();
			} );
		},
		runSuite : function ( suite, parentTopic, befores, afters, done ) {

			done = _.last ( arguments, 'function' );
			if (done === parentTopic) {
				befores = [];
				afters = [];
				parentTopic = {};
			}

			befores = [].concat ( befores, suite.befores );
			afters = [].concat ( afters, suite.afters );

			var topic = { parent : parentTopic };
			if (klunk.options.timeout) topic.timeout = suite.options.timeout || klunk.options.timeout;

			_.serial([

				_.serial.bind ( _, suite.topics, topic ),
				klunk.runSpecs.bind ( klunk, suite, topic, befores, afters ),
				_.serial.bind ( _, suite.codas, topic )

			],
				{method : 'runSuite'},
				function () {
					klunk.runChildren ( suite, topic, befores, afters, function() {

						_.each ( suite.suites, function ( child ) {

							var result = suite.result;
							var childResult = child.result;

							result.failed = result.failed || childResult.failed;

							result.specsRan 	+= childResult.specsRan;
							result.specsFailed 	+= childResult.specsFailed;
							result.totalSpecs 	+= childResult.totalSpecs;
						} );
						done ();
						suite.options.callback && suite.options.callback ( suite )
					});
				}
			);

		},
		runChildren : function ( suite, parentTopic, befores, afters, done ) {

			var ops = [];
			_.each (suite.suites, function ( childSuite ) {
				ops.push ( klunk.runSuite.bind (klunk, childSuite, parentTopic, befores, afters ) )
			}) ;

			var method = _.first ( [suite.options.serial, klunk.options.serial], 'boolean' ) ? "serial" : "parallel";
			_[method] (ops, {method:'runChildren'}, done )
		},
		runSpecs: function (suite, topic, befores, afters, done) {

			var cx, ops = [];

			_.each ( suite.specs, function ( spec ) {

				if (typeof spec.fn == 'function') {

					cx = { expects : expects.bind ( { spec:spec } ), topic : topic };

					var timeout = spec.fn.timeout || suite.options.timeout || klunk.options.timeout;
					if (timeout) cx.timeout = timeout;

					ops.push (
						_.serial.bind ( _, [
							_.serial.bind (_, befores, cx),
							spec.fn,
							_.serial.bind (_, afters, cx)
						], cx )
					);
				}
			});

			var method = _.first ( [suite.options.serial, klunk.options.serial], 'boolean' ) ? "serial" : "parallel";

			_[ method ] ( ops, {method : 'runSpecs'}, function ( error ) {

				suite.result.totalSpecs = suite.result.totalSpecs || suite.specs.length;

				_.each ( suite.specs, function ( spec ) {
					var result = spec.result;

					result.timedOut = spec.fn.timedOut;
					result.triggered = spec.fn.triggered;

					result.failed = !result.triggered || result.timedOut || _.any ( result.expectations, function ( e ) {
						return e.failed
					});

					if (result.triggered) suite.result.specsRan++;
					if (result.failed) suite.result.specsFailed++;

					suite.result.failed = suite.result.failed || result.failed;
				});

				done ();
			});

		},

		/*
		* #descriptors
		* */
		describe: function ( text, define ) {

			var parent = klunk.suite;
			var suite = klunk.newSuite ( text, parent );

			klunk.suite = suite;
			define ();
			klunk.suite = parent;


			var komplete = function () {
				klunk.reportSuite ( suite );
			};
			var kontrol = function ( options ) {

				var isFn = typeof options == 'function';

				if ( isFn || options === undefined || options===true) {
					if (isFn) suite.options.callback = options ;
					klunk.runSuite ( suite, komplete ) ;
					return kontrol ;
				}
				if (options.serial) suite.options.serial = true;
				if (options.callback) suite.options.callback = options.callback;
				if (options.timeout) suite.options.timeout = options.timeout;

				return kontrol;
			};
			_.extend ( kontrol, {
				run : klunk.runSuite.bind ( klunk, suite, komplete ),
				suite: suite
			});




			return kontrol
		},
		newSuite : function ( text, parent ) {
			var suite = {
				text: text, /* description */

				parent: parent, /* parent suite */
				suites: [], /* child suites */

				specs: [], /* direct child specs */
				befores: [], /* beforeEach functions */
				afters: [], /* afterEach functions */
				topics: [], /* topic functions */
				codas: [], /* coda functions */

				result: {
					failed:false,
					rerun: 0,
					totalSpecs: 0,
					specsRan: 0,
					specsFailed: 0 },

				options : {
					serial : parent && parent.serial,
					timeout: null,
					callback : null },

				matchers: _.extend ({}, parent && parent.matchers || {})
			};
			parent && parent.suites.push(suite);

			return suite
		},
		newSpec : function ( text, fn, suite ) {
			return {
				text : text,
				fn : fn,
				suite : suite,
				result: {},
				matchers : {}
			};
		},
		it: function ( text, fn) {

			var suite = klunk.suite;
			var spec = klunk.newSpec ( text, fn, suite );
			suite.specs.push (spec);

			var kontrol = function (opt) {
				opt = opt || {};
				if (opt.timeout) fn.timeout = opt.timeout;
				if (opt.matchers) _.extend(spec.matchers, opt.matchers);
				return kontrol;
			};
			_.extend(kontrol, {
				timeout: function (miliseconds) {fn.timeout = miliseconds; return kontrol}
			});
			return kontrol;
		},
		addManager: function ( type, args ) {

			var text = args[0], fn ;

			fn = _.last ( args, 'function' ) ;
			fn.text = text===fn ? '' : args[0] ;
			klunk.suite[type].push ( fn ) ;

			var kontrol = function (opt) {
				opt = opt || {};
				if ( opt.timeout ) fn.timeout = opt.timeout;
				return kontrol;
			};
			_.extend ( kontrol, {
				timeout : function ( miliseconds ) {
					return kontrol ({timeout : miliseconds})
				}
			} );
			return kontrol;
		},
		beforeEach : function ( text, fn ) {
			return klunk.addManager ('befores', arguments)
		},
		afterEach : function ( text, fn ) {
			return klunk.addManager ('afters', arguments)
		},
		topic: function ( text, fn ) {
			return klunk.addManager ('topics', arguments)
		},
		coda: function ( text, fn ) {
			return klunk.addManager ('codas', arguments)
		},
		/*
		* #report
		* */
		reportSuite : function ( suite, index, indent, top ) {

			indent = indent || 0;
			index = index || 0;
			top = top || suite;

			var space = (new Array(indent)).join("  ");

			if (suite===top) {
				klunk.print (null, suite.text || "Running all suites");
			} else if ( suite.result.failed ) {

				klunk.print ( null, "%s %s",
					space,
					suite.text );
			}
			_.each ( suite.specs, 	klunk.reportSpec, 	klunk, indent, top );
			_.each ( suite.suites, 	klunk.reportSuite, 	klunk, indent + 1, top);

			if (!top || top===suite) {

				if (suite.result.failed) {
					klunk.print ('red', '%s of %s specs failed', suite.result.specsFailed, suite.result.totalSpecs)
				} else {
					klunk.print ( 'green', '%s of %s specs ran', suite.result.specsRan, suite.result.totalSpecs )
				}
			}
		},
		reportSpec : function (spec, index, indent, top) {
			indent = indent || 0;
			var space = (new Array(indent)).join ("  ");

			if (spec.result.failed) {
				klunk.print ('red',
					"  %s %s: failed",
					space,
					spec.text
				);
				_.each (spec.result.expectations, function ( e ) {
					if ( e.failed ) {
						var not = e.not ? "not " : "";
						klunk.print ( null, "  %s - expected %s %s%s %s",
							space,
							e.actual,
							not,
							klunk.specNameToText ( e.name ),
							e.expected
						)
					}
				});
				if (spec.result.timedOut) {
					klunk.print ( null, "  %s - time out", space)
				}
				if (!spec.result.triggered) {
					klunk.print ( null, "  %s - not ran", space)
				}
			}
		},
		print : function (color, text) {
			var ansi={};
			ansi.red   = '\033[31m';
			ansi.blue  = '\033[34m';
			ansi.green  = '\033[32m';
			ansi.reset = '\033[0m';
			if (color) {
				text = ansi[color] + text + ansi.reset;
			}
			console.log.apply(console, [].slice.call(arguments, 1) )
		},
		specNameToText: function ( name ) {
			return name.match (/(^[A-Z]?[^A-Z]*|[A-Z][^A-Z]*)/g ).join (" " ).toLowerCase();
		},

		/*
		* #matchers
		* */
		matchers: {
			toBe: function (expected) { return this.actual===expected },
			toBeDefined: function () { return this.actual!==undefined }
		}
	};

	/*
	*
	* #underscore utility
	*
	* */
	var _ = {
		extend: function () {

			var res = arguments[0];
			for ( var i = 1; i < arguments.length; i++ ) {
				_.each ( arguments[i], function ( v, k ) {
					res[k] = v;
				})
			}
			return res;
		},

		each: function ( obj, iter, context) {

			var args = arguments.length > 2 ? [].slice.call ( arguments, 3 ) : [];

			for (var key in obj) {
				if (!obj.hasOwnProperty || obj.hasOwnProperty(key)) {
					if ( iter.apply ( context, [obj[key], key].concat ( args ) ) ) {
						return obj[key];
					}
				}
			}
		},
		includes: function (obj, value, loose) {

			var yes = false;
			_.each (obj, function ( item ) {
				return ( yes = loose ? item==value : item===value)
			});
			return yes;
		},
		any: function (obj, iter, context) {
			var yes = false;
			var args = _.toArray ( arguments ).slice[3];
			_.each (obj, function ( item, key ) {
				return ( yes = iter.apply ( context || root, [item, key].concat ( args ) ))
			});
			return yes;

		},
		map: function (obj, iter) {
			var res = _.isArray(obj) ? [] : {};
			_.each (obj, function ( v, k ) {
				res[k] = iter ( v, k )
			});
			return res;
		},
		toArray: function (obj) {
			if ( _.isArguments(obj) ) return [].slice.call ( obj, 0);
			return _.map ( obj, function ( v ) {
				return v
			})
		},
		first: function (obj, type) {
			return _.each (obj, function (v) {
				return type ? typeof v==type : true
			})
		},
		last: function (obj, type) {
			var res;
			_.each (obj, function (v) {
				if (!type || typeof v==type) res = v;
			});
			return res;
		},
		isObject: function ( obj ) {
			return Object.prototype.toString.call(obj) == '[object Object]';
		},
		isNull: function ( obj ) {
			return Object.prototype.toString.call(obj) == '[object Null]';
		},
		isArguments: function ( obj ) {
			return Object.prototype.toString.call(obj) == '[object Arguments]';
		},
		isArray: function ( obj ) {
			return Object.prototype.toString.call(obj) == '[object Array]'
		},
		size : function ( obj ) {
			if (!obj) return 0;
			if ( _.isArray(obj) || _.isArguments(obj) || typeof obj=='string') return obj.length;
			return _.keys(obj ).length;
		},
		keys: function ( obj ) {

			if (Object && Object.keys) return Object.keys(obj);

			var keys=[];
			_.each (obj, function ( v, k ) {
				keys.push ( k )
			});
			return keys;

		},
		delay: function ( fn, miliseconds, context, args ) {

			miliseconds = miliseconds || 0;
			context = context || root;
			setTimeout ( fn.bind.apply ( fn, [].slice.call ( arguments, 2 ) ), miliseconds )

		},
		serial : function ( funs, cx, done ) {

			cx = cx || {};

			funs = [].concat(funs);

			var callNext = function ( error ) {

				if ( funs.length  && !error) { // if error is passed the series stops
					_.asyncWrap ( funs.shift (), cx) ( callNext )
				} else {
					done && done ( error )
				}
			};
			callNext ()

		},
		parallel : function ( funs, cx, done ) {

			funs = [].concat(funs);

			var cue = funs.length;
			var erred = false;
			var next = function (error) {
				if (error) erred = true;
				--cue > 0 || done ( erred )
			};

			cue || done ( );

			for (var i in funs) {

				_.asyncWrap ( funs[i], cx ) ( next )
			}
		},
		timeout: function ( miliseconds, fn, done ) {

			var place = 0 ;
			setTimeout (function(){
				place++ || done(true);
			}, miliseconds);
			fn (function() {
				place++ || done ( [false].concat ( _.toArray ( arguments ) ) );
			})
		},
		asyncWrap: function (fn, cx) {

			fn.triggered = false;
			return function (next) {

				var timeout = fn.timeout || cx.timeout;

				function done ( timedOut ) {
					if (timedOut) {
						next ( new _.TimeoutError ("An asynchronous function timed out") );
						fn.timedOut = fn.timedOut || timedOut;
					} else {
						next ();
					}
				}

				fn.triggered = true;

				if ( fn.length ) {
					if ( timeout ) {
						_.timeout (timeout, fn.bind ( cx ), done)
					} else {
						fn.call ( cx, done.bind (this, false) )
					}
				} else {
					fn.call ( cx );
					done ();
				}
			}

		}
	};
	_.TimeoutError = function ( message ) {
		this.message = message;
		this.type = "TimeoutError";
	};
	_.TimeoutError.prototype = new Error;

 	/*
	* #expects method
	* */

	var expects = function (actual) {

		var cx = {actual : actual};
		var matchers = {};
		var spec = this.spec;

		var expectations = spec.result.expectations = spec.result.expectations || [];

		_.each ( _.extend ( {}, klunk.matchers, spec.suite.matchers, spec.matchers ), function ( fn, name ) {

			matchers[name] = function ( expected ) {

				var not = this===matchers.not;

				expectations.push ( {
					name: name,
					not: not,
					failed: not ? fn.call ( cx, expected ) : !fn.call ( cx, expected ),
					expected: fn.length ? expected : '',
					actual:actual
				})
			}
		});
		matchers.not = _.extend ({}, matchers);
		return matchers
	};

	/*
	* #exports
	* */
	exports.matchers = klunk.matchers;
	exports._ = _;
	exports.run = function (cb) {
		klunk.run (cb);
	};
	exports.options = klunk.options;

	describe = exports.describe = klunk.describe.bind(klunk);
	it = exports.it = klunk.it;
	coda = exports.coda = klunk.coda;
	topic = exports.topic = klunk.topic;
	beforeEach = exports.beforeEach = klunk.beforeEach;
	afterEach = exports.afterEach = klunk.afterEach;

	xdescribe = exports.xdescribe = function () {
		var k = function(){return k};
		k.run = k;
		return k;
	};
	xit = exports.xit = function(){};


	// * #init
	klunk.init();

} (typeof window !='undefined' && window || global, typeof module!='undefined' && module.exports || window) );