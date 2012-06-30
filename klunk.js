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
	* # matchers
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
			callback: null,
			report: {
				color: true,
				passed: null
			}
		},
		set: function ( obj, opt ) {
			opt = opt || klunk.options;
			_.each (obj, function ( val, name ) {

				if ( _.isJsObject (opt[name])) {
					_.isJsObject (val) && klunk.set (val, opt[name])
				} else {
					opt[name] = val;
				}
			});
		},
		init : function ( ) {
			klunk.suite = klunk.top = klunk.newSuite();
		},
		/*
		* #run
		* */
		run : function ( cb ) { /* run everything */
			klunk.runSuite ( klunk.top, function () {
				cb && cb (klunk.top);
				klunk.options.callback && klunk.options.callback ( klunk.top )
			} );
		},
		runSuite : function ( suite, parentTopic, done ) {

			if (suite===klunk.top) {
				if (suite.isRunning) return false;
				suite.isRunning = true;
			}

			done = _.last ( arguments, 'function' );
			var reportWhenDone = false;
			if (done === parentTopic) {
				parentTopic = undefined;
				reportWhenDone = true;
			}

			var topic = {
				parent : parentTopic,
				addMatchers: klunk.addMatchers.bind ( suite.matchers )
			};
			var timeout = suite.options.timeout || klunk.options.timeout;
			if (timeout) {
				topic.timeout = timeout;
			}

			_.serial([

				_.serial.bind ( _, suite.topics, topic ),
				klunk.runSpecs.bind ( klunk, suite, topic ),
				_.serial.bind ( _, suite.codas, topic )

			],
				{},
				function whenSuiteIsDone (error) {


					var komplete =function () {
						if ( suite === klunk.top ) {
							delete suite.isRunning;
							klunk.options.callback && klunk.options.callback (suite)
						}
						if ( reportWhenDone ) {
							klunk.report ( suite )
						}
						done && done ( error );
						suite.options.callback && suite.options.callback ( suite );

					};

					if ( error ) {
						komplete ();
						return ;
					}

					klunk.runChildren ( suite, topic, function (error) {

						_.each ( suite.suites, function ( child ) {

							var result = suite.result;
							var childResult = child.result;

							if ( child.options.silent || child.options.solo) return;


							result.failed = result.failed || childResult.failed;

							result.specsRan 	+= childResult.specsRan;
							result.specsFailed 	+= childResult.specsFailed;
							result.totalSpecs 	+= childResult.totalSpecs;
						} );

						komplete()
					});
				}
			);
			return true
		},
		isSerial : function ( suite ) {
			return _.firstBoolean ( suite.options.serial, klunk.options.serial );
		},
		runChildren : function ( suite, parentTopic, done ) {

			var ops = [];
			_.each (suite.suites, function ( childSuite ) {
				childSuite.options.timeout = childSuite.options.timeout || suite.options.timeout;
				childSuite.options.serial = childSuite.options.serial || suite.options.serial;
				childSuite.options.solo ||
					ops.push ( klunk.runSuite.bind (klunk, childSuite, parentTopic ) )
			}) ;

			var method = klunk.isSerial ( suite ) ? "serial" : "parallel";
			_[method] (ops, {}, done )
		},
		cueDescriptors: function ( suite, name, topic, spec, level ) {

			level = level || 0;
			var functions = topic.parent
				? klunk.cueDescriptors ( suite.parent, name, topic.parent, spec, level+1 )
				: [];

			_.each (suite[name], function ( fn, i ) {
				var desc;

				if ( fn.length ) {
					desc = function ( done ) {
						var child = this.topic;
						var cx = this;
						this.topic = topic;
						fn.call ( this, function () {
							// if this function is never called due to a timeout, this context won't used anyway,
							// so there isn't a point trying to restore it anywhere but here
							cx.topic = child;
							done.apply ( this, arguments );
						} );
					};
					desc.timeout = fn.timeout;

				} else {
					desc = function () {
						var child = this.topic;
						this.topic = topic;
						fn.call ( this );
						this.topic = child;
					};
				}
				var result =  {
					timedOut: false,
					triggered: false,
					text: fn.text || i + '-' + level
				};
				spec.result[name].push(result);
				desc.timedOut = function ( val ) {
					result.timedOut = val;
				};
				desc.triggered = function ( val ) {
					result.triggered = val
				};

				functions.push ( desc )


			}, this);

			return functions;
		},
		runSpecs: function (suite, topic, done) {

			var cx, ops = [];

			_.each ( suite.specs, function ( spec ) {

				if (typeof spec.fn == 'function') {

					cx = {
						expects : klunk.expects.bind ( { spec:spec } ),
						topic : topic,
						addMatchers: klunk.addMatchers.bind ( spec.matchers )
					};

					var befores = klunk.cueDescriptors ( suite, 'befores', topic, spec );
					var afters = klunk.cueDescriptors ( suite, 'afters', topic, spec );

					cx.timeout = suite.options.timeout || klunk.options.timeout;

					var fn = spec.fn.bind (cx);
					fn.timeout = spec.fn.timeout || cx.timeout;
					fn.timedOut = function ( val ) {
						spec.result.timedOut = val
					};
					fn.triggered = function ( val ) {
						spec.result.triggered = val
					};

					ops.push (
						_.serial.bind ( _, [

							_.serial.bind (_, befores, cx),
							fn,
							_.serial.bind (_, afters, cx)

						], {} )
					);
				}
			});

			var method = klunk.isSerial ( suite ) ? "serial" : "parallel";

			_[ method ] ( ops, {}, function ( error ) {

				suite.result.totalSpecs = suite.result.totalSpecs || suite.specs.length;

				_.each ( suite.specs, function ( spec ) {
					if ( !spec.fn ) {
						suite.result.totalSpecs--;
						return
					}
					var result = spec.result;

					result.failed = !result.triggered
						|| result.timedOut
						|| _.any ( result.expectations, 'failed')
						|| _.any ( result.befores, 'timedOut')
						|| _.any ( result.afters, 'timedOut')
					;

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

			if ( klunk.options.autorun ) {
				if ( parent === klunk.top ) {

					if ( parent.isRunning ) {
						klunk.runSuite ( suite )
					} else {
						_.delay ( function () {
							if ( !parent.isRunning ) {
								klunk.runSuite ( parent );
							}
						} );
					}
				}
			}

			var runSolo = function ( callback ) {

				if ( callback ) {
					suite.options.callback = callback;
				}

				if ( klunk.options.nosolo || klunk.options.autorun) {
					return;
				}
				suite.options.solo = true;
				klunk.runSuite ( suite );
			};

			var kontrol = function ( options ) {

				var isFn = typeof options == 'function';

				if ( isFn || options === undefined || options === true ) {
					runSolo ( isFn && options );
					return kontrol;
				}

				if ( options.matchers ) {
					kontrol.addMatchers ( options.matchers );
				}
				_.each ( options, function ( value, name ) {
					kontrol[name] && kontrol[name] ( value )
				} );

				return kontrol;
			};
			_.each ( suite.options, function ( v, name ) {
				kontrol[name] = function ( value ) {
					suite.options[name] = value;
					return kontrol
				}
			} );
			_.extend ( kontrol, {
				run : runSolo,
				suite : suite,
				addMatchers : function ( obj ) {
					_.extend ( suite.matchers, obj );
					return kontrol
				}
			} );
			kontrol.matchers = kontrol.addMatchers;

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
				result: {
					befores:[],
					afters:[]
				},
				matchers : {}
			};
		},
		it: function ( text, fn) {

			var suite = klunk.suite;
			if (fn && typeof fn!='function') throw new Error (fn + ' "it" must be a function or empty text');
			var spec = klunk.newSpec ( text, fn, suite );
			suite.specs.push (spec);

			var kontrol = function (opt) {
				opt = opt || {};
				if (opt.timeout) fn.timeout = opt.timeout;
				if (opt.matchers) kontrol.addMatchers(opt.matchers);
				if (opt.callback) kontrol.callback (opt.callback);
				return kontrol;
			};
			_.extend ( kontrol, {
				timeout: function (miliseconds) {fn.timeout = miliseconds; return kontrol},
				addMatchers: function (obj) {_.extend(spec.matchers, obj);return kontrol},
				callback: function (fn) {spec.fn.callback=fn; return kontrol}
			});
			kontrol.matchers = kontrol.addMatchers;
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
				if ( opt.callback ) fn.callback = opt.callback;
				return kontrol;
			};
			_.extend ( kontrol, {
				timeout : function ( miliseconds ) {
					return kontrol ({timeout : miliseconds})
				},
				callback : function (fn) {
					return kontrol ({callback : fn})
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
		* #expects
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
						expected: fn.length ? (cx.expected===undefined ? expected : cx.expected) : '',
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
			toBeTruthy: function () { return !!this.actual },
			toBeDefined: function () { return this.actual!==undefined },
			toHaveKey: function (expected) { return _.has (this.actual,expected)},
			toHaveKeys : function ( expected ) {
				var keys = _.isJsObject ( this.actual ) && _.keys ( this.actual ) ;
				this.actual = keys ? 'object {'+keys+'}' : this.actual;
				return keys &&
					_.intersect ( keys, expected ).length==expected.length
			},
			toEqual: function (expected) { return _.isEqual(this.actual, expected) },
			toStrictlyEqual: function (expected) { return _.isEqual(this.actual, expected, true) },
			toBeEmpty: function () {return _.isEmpty(this.actual) },
			toFail: function () {this.actual = this.actual||'spec'; return false}
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
			var fieldName;
			if (_.type(iter)=='String') {
				fieldName = iter;
				iter = function (item) {
					return item[fieldName]
				}
			}
			_.each (obj, function ( item, key ) {
				return !!( yes = iter.apply ( context || root, [item, key].concat ( args ) ))
			});
			yes = yes || false;
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
			return Object.prototype.hasOwnProperty.call(obj, key)
		},
		get:function (obj,key) {
			return _.isFunction(obj[key]) ? obj[key].apply(obj, _.slice(arguments, 2)) : obj[key];
		},
		set: function ( obj, key, value ) {
			_.isFunction(obj[key]) ? obj[key](value) : obj[key] = value;
		},
		isEmpty: function ( obj ) {

			if (obj==null || !obj.length) return true;
			for (var i in obj) if ( _.has(obj,i)) return false;
			return true;
		},
		isEqual: function (a,b, strict) {
			if (!_.isObject(a)) return strict ? a===b : a==b;
			if (!_.isObject(b)) return false;
			if (_.size (a)!=_.size(b)) return false;
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
		unravel: function (obj, path) {
			path = path.split('.');
			var res = obj;
			for (var i in path) {
				res = res[path[i]];
				if ( !_.isObject (res) ) {
					return i == path.length - 1 ? res : undefined;
				}
			}
			return res;
		},
		delay: function ( fn, miliseconds, context, args ) {

			miliseconds = miliseconds || 0;
			context = context || root;
			return setTimeout ( fn.bind.apply ( fn, _.slice ( arguments, 2 ) ), miliseconds )

		},
		/**
		 * @description Checks a given comparator function every [sleep] number of milliseconds
		 * and times out after [timeout] milliseconds. If times out passes true to the callback.
		 * @param {Number} [sleep=10]
		 * @param {Number} [timeout=5000]
		 * @param {Function} comparator
		 * @param {Function} callback
		 * @param {Object} [context]
		 * @param {*} [arguments]
		 */
		wait: function () {

			var args = _.toArray(arguments);
			var timeout=5*1000, sleep=20, comparator, callback, context;

			if (_.isFunction (args[1]/*sleep*/)) {}
			else if ( _.isFunction (args[0]/*timeout*/)) {
			} else {
			}
			if ( !_.isFunction(args[1])) {
				sleep = args.shift();
				timeout = args.shift();
			} else if ( !_.isFunction(args[0])) {
				timeout = args.shift();
			}
			comparator = args.shift();
			callback = args.shift();
			context = args.shift() || root;

			var t = setTimeout(function () {
				clearInterval(i);
				callback.call ( context, true );
			}, timeout );
			var i = setInterval(checkValue, sleep );

			if (sleep!==0) checkValue();

			function checkValue () {
				if ( comparator.apply ( context, args ) ) {
					clearTimeout ( t );
					clearInterval ( i );
					callback.call ( context, false );
				}
			}

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
			var erred;
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
					// the interval is cleared because otherwise node waits for it to finish before exiting
					clearTimeout(t);
					done.apply ( root, [false].concat ( _.toArray ( arguments ) ) );
				}
			})
		},
		asyncWrap: function (fn, cx) {
			cx = cx || null;

			return function (next) {

				var timeout = fn.timeout || cx.timeout;

				function done ( timedOut, error ) {
					var z = timeout;
					if (timedOut) {
						var timeoutError = new _.TimeoutError ("An asynchronous function timed out");
						_.set ( fn, 'timedOut', timedOut && timeoutError );
						next ( timeoutError );
					} else {
						next ( error );
					}
				}

				_.set ( fn, 'triggered', true );

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


			if (suite===top) {
				this.print (0, null, suite.text || "Running all suites");
			} else if ( suite.result.failed ) {

				this.print ( indent, null, _.sprintf( "%s", suite.text) );
			}


			_.each (suite.topics, function ( fn, i ) {
				if ( fn.timedOut ) this.print (indent, 'red', _.sprintf("  topic \"`%s`\" timed out", fn.text || i))
			},this);
			_.each (suite.codas, function ( fn, i ) {
				if ( fn.timedOut ) this.print (indent, 'red', _.sprintf("  coda \"`%s`\" timed out", fn.text || i))
			},this);

			_.each ( suite.specs, 	this.reportSpec, 	this, indent, top );
			_.each ( suite.suites, 	this.reportSuite, 	this, indent + 1, top);


			if (!top || top===suite) {

				this.print();
				if ( suite.result.failed ) {
					this.print ( 0, 'red', _.sprintf('%s of %s specs failed', suite.result.specsFailed, suite.result.totalSpecs));
				} else {
					this.print ( 0, 'green', _.sprintf('%s of %s specs ran', suite.result.specsRan, suite.result.totalSpecs) )
				}
			}
		},
		reportSpec : function (spec, index, indent, top) {
			indent = indent || 0;

			if (spec.result.failed) {
				var reason = 'failed';
				if (spec.result.timedOut) {
					reason = "timed out"
				}
				if (!spec.result.triggered) {
					reason = "did not execute"
				}
				this.print (indent, 'red',
					_.sprintf("  spec \"`%s`\" %s",
					spec.text,
						reason
				));
				_.each (spec.result.expectations, function ( e ) {
					if ( e.failed ) {
						var not = e.not ? "not " : "";
						this.print ( indent, null, _.sprintf("  - expected %s %s%s %s",
							e.actual,
							not,
							this.specNameToText ( e.name ),
							e.expected)
						);
						this.print (0, 'red', e.stack + '\n')
					}
				}, this );

			}
			_.each (spec.result.befores, function ( stats, i ) {
				if ( stats.timedOut ) this.print (indent, 'red', _.sprintf("    beforeEach \"`%s`\" timed out", stats.text || i))
			},this);
			_.each (spec.result.afters, function ( stats, i ) {
				if ( stats.timedOut ) this.print (indent, 'red', _.sprintf("    afterEach \"`%s`\" timed out", stats.text || i))
			},this);

		},
		print : function (indent, color, text) {
			var ansi={};
			ansi.red   = '\033[31m';
			ansi.blue  = '\033[34m';
			ansi.green  = '\033[32m';
			ansi.reset = '\033[0m';
			var del = this.options.colorDelimiter || '`';
			text = (new Array(indent)).join(' ') + text;

			if ( color && this.options.color ) {
				if ( !~text.indexOf(del)) {
					text = ansi[color] + text + ansi.reset;
				} else {
					text = text.replace(new RegExp(del+"(.*?)"+del), ansi[color] + '$1' + ansi.reset)
				}
			}
			this.puts.apply ( this, [].slice.call(arguments, 2) )
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
	exports.run = function (opt) {
		var cb = _.isFunction(opt) && opt;
		if ( _.isJsObject(opt)) {
			klunk.set(opt);
		}
		klunk.run (function(suite, report){
			cb && cb ( suite, report );
		});
	};
	exports.options = klunk.options;
	exports.set = function ( options ) {
		klunk.set ( options );
		return exports;
	};
	exports.addMatchers = klunk.addMatchers.bind(klunk.matchers);

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