/*
     klunk.js 0.0.1
     (c) 2012 Bijou Trouvaille
     Klunk is freely distributable under the MIT license.
     No code was directly copied, but many parts were inspired by Underscore, Jasmine, Vows, and Pavlov libraries
*/

(function (root, exports) {

	/*
	* #toc TABLE OF CONTENTS
	* # run runSuite, runSpec, etc...
	* # descriptors describe, it, beforeEach, etc...
	* # report reportSuite, reportSpec, etc...
	* # underscore utility
	* # expect method
	* # exports - thank you klunk
	* */

	var klunk = {

		top: null /* top suite */,
		options: {
			/* a null defaults to false */
			autorun: false,
			serial: null,
			timeout: 5000,
			silent: null,
			nosolo: null,
			report: {
				color: true,
				passed: null
			}
		},
		set: function ( obj, opt ) {
			opt = opt || klunk.options;
			_.each (obj, function ( val, name ) {

				if ( _.isObject (opt[name])) {
					_.isObject (val) && klunk.set (val, opt[name])
				} else {
					opt[name] = val;
				}
			});
			return exports;
		},
		init : function ( ) {
			klunk.suite = klunk.top = klunk.newSuite();
		},
		/*
		* #run
		* */
		run : function ( cb ) { /* run everything */
			klunk.runSuite ( klunk.top, function() {
				klunk.report ( klunk.top );
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

			var topic = {
				parent : parentTopic,
				addMatchers: klunk.addMatchers.bind ( suite.matchers )
			};
			if (klunk.options.timeout) topic.timeout = suite.options.timeout || klunk.options.timeout;

			_.serial([

				_.serial.bind ( _, suite.topics, topic ),
				klunk.runSpecs.bind ( klunk, suite, topic, befores, afters ),
				_.serial.bind ( _, suite.codas, topic )

			],
				{method : 'runSuite'},
				function (error) {

					if (error) return done(error);

					klunk.runChildren ( suite, topic, befores, afters, function () {

						_.each ( suite.suites, function ( child ) {

							var result = suite.result;
							var childResult = child.result;

							if ( child.options.silent || child.options.solo) return;


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
				childSuite.options.timeout = childSuite.options.timeout || suite.options.timeout;
				childSuite.options.solo ||
					ops.push ( klunk.runSuite.bind (klunk, childSuite, parentTopic, befores, afters ) )
			}) ;

			var method = _.firstBoolean ( suite.options.serial, klunk.options.serial) ? "serial" : "parallel";
			_[method] (ops, {method:'runChildren'}, done )
		},
		runSpecs: function (suite, topic, befores, afters, done) {

			var cx, ops = [];

			_.each ( suite.specs, function ( spec ) {

				if (typeof spec.fn == 'function') {

					cx = {
						expects : klunk.expects.bind ( { spec:spec } ),
						topic : topic,
						addMatchers: klunk.addMatchers.bind (spec.matchers)
					};

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

			var method = _.firstBoolean ( suite.options.serial, klunk.options.serial) ? "serial" : "parallel";

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

				done (error);
			});

		},
		report: function ( suite ) {

			var reporter;
			if ( suite.options.silent || klunk.options.silent ) {
				return
			}

			reporter =
				(suite.options.reporter || klunk.options.reporter || new TerminalReporter ( klunk.options.report ));

			reporter.report ( suite )
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

			if (klunk.options.autorun && parent===klunk.top) klunk.run ();

			var komplete = function () {
				klunk.report ( suite );
			};

			var runSolo = function (callback) {

				if (callback) suite.options.callback = callback;

				if (klunk.options.nosolo) return;
				suite.options.solo = true;
				klunk.runSuite ( suite, komplete );
			};

			var kontrol = function ( options ) {

				var isFn = typeof options == 'function';

				if ( isFn || options === undefined || options===true) {
					runSolo (isFn && options);
					return kontrol ;
				}
				if (options.serial) suite.options.serial = true;
				if (options.callback) suite.options.callback = options.callback;
				if (options.timeout) suite.options.timeout = options.timeout;
				if (options.silent) suite.options.silent = options.silent;

				return kontrol;
			};
			_.extend ( kontrol, {
				run : runSolo,
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
					silent: null,
					callback : null },

				matchers: {}
			};
			parent && parent.suites.push ( suite );

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
			_.extend ( kontrol, {
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
		* #expects method
		* */
		getSuiteMatchers: function (suite) {
			return _.extend ( {}, suite.matchers, suite.parent && klunk.getSuiteMatchers ( suite.parent ) || {} )
		},
		expects: function (actual) {

			var matchers = {};
			var spec = this.spec;
			var stack = (new Error).stack;
			var expectations = spec.result.expectations = spec.result.expectations || [];

			_.each ( _.extend ( {}, klunk.matchers, klunk.getSuiteMatchers(spec.suite), spec.matchers ), function ( fn, name ) {

				matchers[name] = function ( expected ) {

					var not = this===matchers.not;

					var cx = {actual : actual};
					var passed = fn.call ( cx, expected );

					expectations.push ( {
						name: name,
						not: not,
						failed: not ? passed : !passed,
						expected: fn.length ? expected : '',
						actual: cx.actual,
						stack:stack
					})
				}
			});
			matchers.not = _.extend ({}, matchers);
			return matchers
		},

		addMatchers : function ( matchers ) {
			_.extend ( this, matchers )
		},
		/*
		* #matchers
		* */
		matchers: {
			toBe: function (expected) { return this.actual===expected },
			toBeFalsy: function () { return !this.actual },
			toBeTruthy: function () { return this.actual==true },
			toBeDefined: function () { return this.actual!==undefined },
			toHaveKey: function (expected) { return _.has (this.actual,expected)},
			toHaveKeys : function ( expected ) {
				var keys = _.isJsObject ( this.actual ) && _.keys ( this.actual ) ;
				this.actual = keys ? 'object {'+keys+'}' : this.actual;
				return keys &&
					_.intersect ( keys, expected ).length==expected.length
			},
			toEqual: function (expected) { return _.isEqual(this.actual, expected) }
		}
	};

	//<editor-fold desc="underscore">
	/*
	* #underscore utility
	* */
	var _ = {
		sprintf: function ( str ) {

			var args = _.slice(arguments, 1);
			args.length && _.each (str.match (/%s/g), function (v, i) {
				str = args.length ? str.replace ( v, args.shift() ) : str
			});
			_.each (args, function ( v ) {
				str+= ' ' + v;
			});
			return str;
		},
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
					if ( iter.apply ( context, [obj[key], key].concat ( args ) ) === true ) {
						return obj[key];
					}
				}
			}
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
			var res = _.isArray(obj) || _.isArguments(obj) ? [] : {};
			_.each (obj, function ( v, k ) {
				res[k] = iter ( v, k )
			});
			return res;
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
		firstBoolean: function () {
			return  _.first ( arguments.length > 1 ? arguments : arguments[0], 'boolean' )
		},
		type: function (obj) {
			return Object.prototype.toString.call (obj ).replace ('[object ','' ).replace(']','')
		},
		isObject: function ( obj ) {
			return obj===Object(obj);
		},
		isJsObject: function ( obj ) {
			return _.type(obj) == 'Object';
		},
		isNull: function ( obj ) {
			return _.type(obj) == 'Null';
		},
		isFunction: function ( obj ) {
			return _.type(obj) == 'Function';
		},
		isArguments: function ( obj ) {
			return _.type(obj) == 'Arguments';
		},
		isArray: function ( obj ) {
			return _.type(obj) == 'Array';
		},
		toArray: function (obj) {
			if ( _.isArguments(obj) ) return [].slice.call ( obj, 0);
			return _.map ( obj, function ( v ) {
				return v
			})
		},
		slice: function (obj, index) {
			return [].slice.call (obj, index)
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
		has: function (obj, key) {
			Object.prototype.hasOwnProperty.call(obj, key)
		},
		isEqual: function (a,b, strict) {
			if (!_.isObject(a)) return strict ? a===b : a==b;
			if (!_.isObject(b)) return false;
			return !_.any (a, function ( v, key ) {
				return !_.isEqual ( v, b[key], strict )
			})
		},
		intersect: function () {
			var res = arguments[0], i;
			_.each ( _.slice ( arguments, 1 ), function ( o ) {
				for (var key=0; key < res.length; key++ ) {
					i = o.indexOf ( res[key] );
					~i || res.splice ( key--, 1 );
				}
			});
			return res;
		},
		delay: function ( fn, miliseconds, context, args ) {

			miliseconds = miliseconds || 0;
			context = context || root;
			return setTimeout ( fn.bind.apply ( fn, _.slice ( arguments, 2 ) ), miliseconds )

		},
		wait: function ( sleep, milliseconds, comparator, done, context) {

			var args = _.toArray(arguments);
			var ms=5*1000, sl=20, co, dn, cx;

			if (_.isFunction (sleep)) {}
			else if ( _.isFunction (milliseconds)) {
				ms = args.shift();
			} else {
				sl = args.shift();
				ms = args.shift();
			}
			co = args.shift();
			dn = args.shift();
			cx = args.shift() || root;

			var t = setTimeout(function () {
				clearInterval(i);
				dn.apply ( cx, args );
			}, ms );
			var i = setInterval(function () {
				if ( co.apply ( cx, args ) ) {
					clearTimeout ( t );
					clearInterval ( i );
					dn.apply ( cx, args );
				}
			}, sl );
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
				if (error) erred = error;
				--cue > 0 || done ( erred )
			};

			cue || done ( );

			for (var i in funs) {

				_.asyncWrap ( funs[i], cx ) ( next )
			}
		},
		timeout: function ( miliseconds, fn, done ) {

			var place = 0 ;
			var t = setTimeout ( function () {
				place++ || done ( true );
			}, miliseconds);
			fn (function() {
				if (!place++) {
					done.apply ( root, [false].concat ( _.toArray ( arguments ) ) );
					// the interval is cleared because otherwise node waits for it to finish before exiting
					clearTimeout(t);
				}
			})
		},
		asyncWrap: function (fn, cx) {

			return function (next) {

				var timeout = fn.timeout || cx.timeout;

				function done ( timedOut, error ) {
					if (timedOut) {
						var timeoutError = new _.TimeoutError ("An asynchronous function timed out");
						next ( timeoutError );
						fn.timedOut = fn.timedOut || timedOut && timeoutError;
					} else {
						next  ( error );
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
	};
	_.TimeoutError.prototype = new Error;
	//</editor-fold>

	//<editor-fold desc="TerminalReporter">
	/*
	* #reporter
	* */
	var TerminalReporter = function (opt, suite) {
		this.options = opt;
		this.puts = opt.puts || console.log.bind(console);
		if (suite) this.report (suite);
	};
	_.extend ( TerminalReporter.prototype, {
		report : function ( suite ) {
			this.reportSuite (suite || klunk.top)
		},
		reportSuite : function ( suite, index, indent, top ) {


			indent = indent || 0;
			index = index || 0;
			top = top || suite;

			if (suite.options.silent || this.options.silent) return;
			if (suite.options.solo && suite!==top) return;


			var space = (new Array ( indent )).join ( "  " );

			if (suite===top) {
				this.print (null, suite.text || "Running all suites");
			} else if ( suite.result.failed ) {

				this.print ( null, _.sprintf("%s %s",
					space,
					suite.text) );
			}

			_.each ( suite.specs, 	this.reportSpec, 	this, indent, top );
			_.each ( suite.suites, 	this.reportSuite, 	this, indent + 1, top);

			_.each (suite.topics, function ( fn ) {
				if ( fn.timedOut) this.print ('red', _.sprintf("%s topic \"%s\" timed out", space, fn.text || "unnamed"))
			},this);
			_.each (suite.codas, function ( fn ) {
				if ( fn.timedOut) this.print ('red', _.sprintf("%s coda \"%s\" timed out", space, fn.text || "unnamed"))
			},this);
			_.each (suite.befores, function ( fn ) {
				if ( fn.timedOut) this.print ('red', _.sprintf("%s beforeEach \"%s\" timed out", space, fn.text || "unnamed"))
			},this);
			_.each (suite.afters, function ( fn ) {
				if ( fn.timedOut) this.print ('red', _.sprintf("%s afterEach \"%s\" timed out", space, fn.text || "unnamed"))
			},this);


			if (!top || top===suite) {

				this.print();
				if ( suite.result.failed ) {
					this.print ( 'red', _.sprintf('%s of %s specs failed', suite.result.specsFailed, suite.result.totalSpecs));
				} else {
					this.print ( 'green', _.sprintf('%s of %s specs ran', suite.result.specsRan, suite.result.totalSpecs) )
				}
			}
		},
		reportSpec : function (spec, index, indent, top) {
			indent = indent || 0;
			var space = ( new Array ( indent ) ).join ( "  " );

			if (spec.result.failed) {
				this.print ('red',
					_.sprintf("  %s %s: failed",
					space,
					spec.text
				));
				_.each (spec.result.expectations, function ( e ) {
					if ( e.failed ) {
						var not = e.not ? "not " : "";
						this.print ( null, _.sprintf("  %s - expected %s %s%s %s",
							space,
							e.actual,
							not,
							this.specNameToText ( e.name ),
							e.expected)
						);
						this.print ('red', e.stack)
					}
				}, this );
				if (spec.result.timedOut) {
					this.print ( null, _.sprintf("  %s - time out", space))
				}
				if (!spec.result.triggered) {
					this.print ( null, _.sprintf("  %s - not ran", space))
				}
			}
		},
		print : function (color, text) {
			var ansi={};
			ansi.red   = '\033[31m';
			ansi.blue  = '\033[34m';
			ansi.green  = '\033[32m';
			ansi.reset = '\033[0m';

			if ( color && this.options.color ) {
				text = ansi[color] + text + ansi.reset;
			}
			this.puts.apply ( this, [].slice.call(arguments, 1) )
		},
		specNameToText: function ( name ) {
			return name.match (/(^[A-Z]?[^A-Z]*|[A-Z][^A-Z]*)/g ).join ( " " ).toLowerCase();
		}
	});
	//</editor-fold>

	//<editor-fold desc="exports">
	/*
	* #exports
	* */
	exports.matchers = klunk.matchers;
	exports._ = _;
	exports.run = function (cb) {
		klunk.run (cb);
	};
	exports.options = klunk.options;
	exports.set = function ( options ) {
		klunk.set ( options )
	};

	exports.topic = {};

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
	//</editor-fold>


	// * #init
	klunk.init();

} (typeof window !='undefined' && window || global, typeof module!='undefined' && module.exports || window) );