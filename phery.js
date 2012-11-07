/* * **** BEGIN LICENSE BLOCK *****
 * Version: MPL 2.0
 *
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL was
 * not distributed with this file, You can obtain one at
 * http://mozilla.org/MPL/2.0/. *
 *
 * ***** END LICENSE BLOCK ***** */

/*jshint jquery:true,sub:true,evil:true,browser:true,devel:true */

(function ($, window, undefined) {
	"use strict";

	var
		call_cache = [],
		/**
		 * @class
		 * @version 1.1
		 */
		phery = window.phery = window.phery || {};

	/* Code from http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/ */
	Object.toType = (function toType(global) {
		return function (obj) {
			if (obj === global) {
				return "global";
			}
			return typeof obj === 'undefined' ? 'undefined' : ({}).toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
		};
	})(window);

	function per_data(this_data, args){
		var
			type = Object.toType(this_data),
			arg_type = Object.toType(args),
			x, i;

		switch (type) {
			case 'array':
				switch (arg_type){
					case 'array':
						this_data.concat(args);
						break;
					case 'object':
					case 'string':
					case 'null':
					case 'boolean':
					case 'number':
						this_data.push(args);
						break;
				}
				break;
			case 'object':
				switch (arg_type){
					case 'object':
						this_data = $.extend(this_data, args);
						break;
					case 'array':
						i = 0;
						for (x = 0; x < args.length; x++) {
							while (typeof this_data[i] !== 'undefined') { i++; }
							this_data[i] = args[x];
						}
						break;
					case 'number':
					case 'string':
					case 'null':
					case 'boolean':
						i = 0;
						while (typeof this_data[i] !== 'undefined') { i++; }
						this_data[i] = args;
						break;
				}
				break;
			case 'string':
			case 'number':
			case 'null':
			case 'boolean':
				this_data = [].concat(this_data, args);
				break;
			case 'undefined':
				if (arg_type === 'object') {
					this_data = args;
				} else {
					this_data = [].concat(args);
				}
				break;
		}
		return this_data;
	}

	function append_args(args) {
		/*jshint validthis: true */
		var this_data, x;

		if (args[0] && args[0].constructor === Array)
		{
			args = args[0];
		}

		for (x in args){
			if (args.hasOwnProperty(x)) {
				this_data = this.data('args.phery');
				this.data('args.phery', per_data(this_data, args[x]));
			}
		}
	}

	function set_args(args) {
		/*jshint validthis: true */
		if (Object.toType(args) !== 'function') {
			this.data('args.phery', per_data(undefined, args[0]));
		}
	}

	/**
	 * Compare array
	 * @param {Array} x
	 * @param {Array} y
	 * @return {Boolean}
	 */
	function compare_array(x, y) {
		if (x === y) {
			return true;
		}
		if (x.length !== y.length) {
			return false;
		}
		for (var i = 0; i < x.length; i++) {
			if (x[i] !== y[i]) {
				return false;
			}
		}
		return true;
	}

	function str_is_function(str, process) {
		if (!str || typeof str['toString'] !== 'function') {
			return false;
		}
		str = str.toString();
		var is_it = (/^[\s;]*function\(/im.test(str)) && (/\};?$/m.test(str));

		if (is_it && process) {
			var
				cache_len = call_cache.length,
				fn = null,
				i;

			for (i = 0; i < cache_len; i++) {
				if (call_cache[i].str === str) {
					fn = call_cache[i].fn;
					break;
				}
			}

			if (typeof fn !== 'function') {
				var
					f_args = str.match(/function\s*\(([^\)]*)\)/im)[1],
					f_body = str.slice(str.indexOf('{') + 1, str.lastIndexOf('}'));

				if (!f_body) {
					return false;
				}

				fn = new Function(f_args, f_body);

				call_cache.push({
					'str':str,
					'fn':fn
				});
			}
			return fn;
		}
		return is_it;
	}

	var
		options = {},
		defaults = {
			'cursor':true,
			'default_href':false,
			'ajax':{
				'retries':0
			},
			'enable':{
				'log':false,
				'log_history':false,
				'per_element':{
					'events':true
				}
			},
			'debug':{
				'enable':false,
				'display':{
					'events':true,
					'remote':true,
					'config':true
				}
			},
			'delegate':{
				'confirm':['click'],
				'form':['submit'],
				'select_multiple':['blur'],
				'select':['change'],
				'tags':['click']
			}
		},
		_callbacks = {
			'before':function () {
				return true;
			},
			'beforeSend':function () {
				return true;
			},
			'params':function () {
				return true;
			},
			'always':function () {
				return true;
			},
			'fail':function () {
				return true;
			},
			'done':function () {
				return true;
			},
			'after':function () {
				return true;
			},
			'exception':function () {
				return true;
			},
			'json':function () {
				return true;
			}
		},
		callbacks = $('<div/>'),
		_log = [],
		$original_cursor,
		$body_html;

	function debug(data, type) {
		if (options.debug.enable) {
			if (typeof console !== 'undefined' && typeof console['dir'] === 'function') {
				if (typeof options.debug.display[type] !== 'undefined' && options.debug.display[type] === true) {
					console.dir(data);
				}
			}
		}
	}

	function do_cursor(cursor) {
		if (options.cursor) {
			if (!cursor) {
				$body_html.css('cursor', $original_cursor);
			} else {
				$body_html.css('cursor', cursor);
			}
		}
	}

	function triggerAndReturn(el, name, data, context) {
		context = context || null;

		var
			event = $.Event(name),
			res;

		if (context) {
			event['target'] = context;
		}

		el.triggerHandler(event, data);

		res = (event.result !== false);

		debug(['event triggered', {
			'name':name,
			'event result':res,
			'element':el,
			'data':data
		}], 'events');

		return res;
	}

	function triggerPheryEvent(el, event_name, data, triggerData) {
		data = data || [];
		triggerData = triggerData || false;

		if (triggerData) {
			triggerAndReturn(callbacks, event_name, data, el);

			if (el && options.enable.per_element.events) {
				triggerAndReturn(el, 'phery:' + event_name, data);
			}

			return true;
		} else {
			if (triggerAndReturn(callbacks, event_name, data, el) === false) {
				return false;
			}

			if (el && options.enable.per_element.events) {
				return triggerAndReturn(el, 'phery:' + event_name, data);
			}

			return true;
		}
	}

	function countProperties(obj) {
		var count = 0;

		if (typeof obj === 'object') {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					++count;
				}
			}
		} else {
			if (typeof obj['length'] !== 'undefined') {
				count = obj.length;
			}
		}

		return count;
	}

	function clean_up(el) {
		if (el.data('temp.phery')) {
			el.off();
			el.removeProp();
			$.removeData(el);
			el.remove();
		}
	}

	function form_submit($this) {
		if ($this.data('confirm.phery')) {
			if (!confirm($this.data('confirm.phery'))) {
				return false;
			}
		}
		$this.find('input[name="phery[remote]"]').remove();
		return ajax_call.call($this);
	}

	function ajax_call(args) {
		/*jshint validthis:true*/
		if (triggerPheryEvent(this, 'before') === false) {
			clean_up(this);
			return false;
		}

		var
			_headers = {
				'X-Requested-With':'XMLHttpRequest',
				'X-Phery':1
			},
			el = this,
			url = el.attr('action') || el.attr('href') || el.data('target.phery') || options.default_href || window.location.href,
			type = el.data('type.phery') || 'json',
			method = el.attr('method') || el.data('method.phery') || 'GET',
			submit_id = el.attr('id') || el.parent().attr('id') || null,
			requested,
			ajax,
			data = {
				'args': undefined,
				'phery':{
					'method':method
				}
			};

		if (el.data('args.phery')) {
			try {
				data['args'] = per_data({}, el.data('args.phery'));
			} catch (exception) {
				triggerPheryEvent(el, 'exception', [phery.log(exception)]);
			}
		} else {
			if (el.is('input')) {
				if (el.attr('name')) {
					var inputs = {};
					if (!el.is('[type="checkbox"],[type="radio"]')) {
						inputs[el.attr('name')] = el.val();
					} else {
						inputs[el.attr('name')] = {
							'checked':el.prop('checked') ? 1 : 0,
							'value':el.val()
						};
					}
					data['args'] = per_data({}, inputs);
				}
			} else if (typeof args !== 'undefined') {
				data['args'] = per_data({}, args);
			}
		}

		if (el.is('form')) {
			try {
				data['args'] = per_data(
					data['args'],
					el.serializeForm(el.data('submit.phery') ? el.data('submit.phery') : {})
				);
			} catch (exception) {
				triggerPheryEvent(el, 'exception', [phery.log(exception)]);
			}
		}

		if (el.is('select')) {
			if (el.attr('multiple')) {
				if (el.attr('name')) {
					var select_multiple = {};
					select_multiple[el.attr('name')] =
						el
						.find('option')
						.filter(':selected')
						.map(function () {
							return $(this).val();
						}).get();
					data['args'] = per_data(data['args'], select_multiple);
				} else {
					data['args'] = per_data(
						data['args'],
						el
						.find('option')
						.filter(':selected')
						.map(function () {
							return $(this).val();
						}).get()
					);
				}
			} else {
				if (el.attr('name')) {
					var select = {};
					select[el.attr('name')] = el.val();
					data['args'] = per_data(data['args'], select);
				} else {
					data['args'] = per_data(data['args'], el.val());
				}
			}
		}

		if (el.data('related.phery')) {
			try {
				var
					_related = el.data('related.phery'),
					related, split, _selector;

				switch (typeof _related) {
					case 'string':
						if (_related.indexOf(',') > -1) {
							split = _related.split(',');
							related = $();
							for (var i = 0; i < split.length; i++)
							{
								_selector = el.find(split[i]);
								if (!_selector.size())
								{
									_selector = $(split[i]);
								}
								related = related.add(_selector);
							}
						} else {
							related = el.find(_related);
							if (!related.size())
							{
								related = $(_related);
							}
						}
						break;
					case 'object':
						related = _related;
						break;
					default:
						related = false;
				}

				if (related !== false) {
					if (related.size()) {
						var tmprelated = {}, count = 0;

						related.each(function () {
							var $this = $(this);
							if ($this.attr('id')) {
								tmprelated[$this.attr('id')] = $this.val();
							} else if ($this.attr('name')) {
								tmprelated[$this.attr('name')] = $this.val();
							} else {
								tmprelated[count++] = $this.val();
							}
						});

						data['args'] = per_data(data['args'], tmprelated);
					} else {
						triggerPheryEvent(el, 'exception', [phery.log('data-related selector found no elements')]);
					}
				}
			} catch (exception) {
				triggerPheryEvent(el, 'exception', [phery.log(exception, 'invalid data-related info')]);
			}
		}

		if (submit_id) {
			data['phery']['submit_id'] = submit_id;
		}

		if (el.data('view.phery')) {
			data['phery']['view'] = '#' + el.attr('id');
		} else if (el.data('remote.phery')) {
			data['phery']['remote'] = el.data('remote.phery');
		}

		var _tmp = {};
		triggerPheryEvent(el, 'params', _tmp, true);
		data['phery'] = $.extend(_tmp, data['phery']);

		requested = new Date();

		debug(['remote call', {
			'data':data,
			'timestamp':requested.getTime(),
			'time':requested.toLocaleString()
		}], 'remote');

		requested = requested.getTime();

		var opt = {
			url:(
				url.indexOf('_=') === -1 ?
					(url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + requested)
					:
					(url.replace(/_=(\d+)/, '_=' + requested))
				),
			data:data,
			dataType:type,
			type:"POST",
			el:el,
			global:false,
			try_count:0,
			retry_limit:options.ajax.retries,
			cache:false,
			processData:true,
			headers:_headers,
			'beforeSend':function (xhr, settings) {
				do_cursor('wait');

				return triggerPheryEvent(this.el, 'beforeSend', [xhr, settings]) !== false;
			}
		};

		var
			_fail = function (xhr, status, error) {
				if (this.retry_limit && status === 'timeout') {
					this.try_count++;

					if (this.try_count <= this.retry_limit) {
						this.dataType = "text " + type;

						this.url =
							this.url.indexOf('_try_count=') === -1 ?
								(this.url + '&_try_count=' + this.try_count) :
								(this.url.replace(/_try_count=(\d+)/, '_try_count=' + this.try_count));

						this.url = this.url.replace(/_=(\d+)/, '_=' + new Date().getTime());

						set_ajax_opts(this);
						return false;
					}
				}

				do_cursor(false);

				if (triggerPheryEvent(this.el, 'fail', [xhr, status, error]) === false) {
					clean_up(this.el);
					return false;
				}
				clean_up(this.el);
				return true;
			},
			_done = function (data, text, xhr) {
				if (triggerPheryEvent(this.el, 'done', [data, text, xhr]) === false) {
					return false;
				}
				processRequest.call(this.el, data);
				return true;
			},
			_always = function (data, text, xhr) {
				if (xhr.readyState !== 4 && this.try_count && this.try_count <= this.retry_limit) {
					return false;
				}

				do_cursor(false);

				if (triggerPheryEvent(this.el, 'always', [xhr]) === false) {
					clean_up(this.el);
					return false;
				}

				clean_up(this.el);
				return true;
			};

		var set_ajax_opts = function (opt) {
			var _ajax = $.ajax(opt);

			_ajax
				.done(_done)
				.always(_always)
				.fail(_fail);

			return _ajax;
		};

		ajax = set_ajax_opts(opt);

		return ajax;
	}

	function set_events() {
		var $document = $(document);

		$document
			.off('.phery');

		$document
			.on(options.delegate.confirm.join('.phery,') + '.phery', '[data-confirm]:not(form)', function (e) {
				if (!confirm($(this).data('confirm.phery'))) {
					e.stopImmediatePropagation();
				} else {
					e.preventDefault();
				}
			});

		$document
			.on(options.delegate.form.join('.phery,') + '.phery', 'form[data-remote]', function () {
				var $this = $(this);
				form_submit($this);
				return false;
			});

		$document
			.on(options.delegate.tags.join('.phery,') + '.phery', '[data-remote]:not(form,select)', function (e) {
				var $this = $(this);

				ajax_call.call($this);

				if (!$this.is('input[type="text"],input[type="checkbox"],input[type="radio"],input[type="image"]')) {
					e.preventDefault();
				}
			});

		$document
			.on(options.delegate.select.join('.phery,') + '.phery', 'select[data-remote]:not([multiple])', function () {
				ajax_call.call($(this));
			});

		$document
			.on(options.delegate.select_multiple.join('.phery,') + '.phery', 'select[data-remote][multiple]', function () {
				ajax_call.call($(this));
			});
	}

	function processRequest(data) {
		/*jshint validthis:true */
		if (!this.data('remote.phery') && !this.data('view.phery')) {
			triggerPheryEvent(this, 'after', []);
			return;
		}

		var $jq, argv, argc, func_name, $this = this, is_selector, funct, _data, _argv;

		var process_parameters = function(args){
			var out = [], i, func, x;
			for (i in args) {
				if (args.hasOwnProperty(i)) {
					if (args[i].constructor === Array) {
						return process_parameters(args[i]);
					} else if (args[i].constructor === Object) {
						if (typeof args[i]['PheryFunction'] !== 'undefined') {
							if ((func = str_is_function(args[i]['PheryFunction'], true))){
								out.push(func);
							} else {
								out.push(null);
							}
						} else if (typeof args[i]['PheryResponse'] !== 'undefined') {
							for (x in args[i]['PheryResponse']) {
								if (args[i]['PheryResponse'].hasOwnProperty(x)){
									out.push(process($(x), args[i]['PheryResponse'][x]));
								}
							}
						} else {
							out.push(args[i]);
						}
					} else {
						out.push(args[i]);
					}
				}
			}
			return out;
		};

		var process = function (obj, item) {
			for (var i in item) {
				if (item.hasOwnProperty(i)) {
					argv = item[i]['a'];
					try {
						func_name = argv.shift();
						if (typeof obj[func_name] === 'function') {
							if (typeof argv[0] !== 'undefined' && (argv[0].constructor === Array || argv[0].constructor === Object)) {
								obj = obj[func_name].apply(obj, process_parameters(argv));
							} else if (argv.constructor === Array) {
								obj = obj[func_name].apply(obj, argv || null);
							} else {
								obj = obj[func_name].call(obj, argv || null);
							}
						} else {
							throw 'no function "' + func_name + '" found in jQuery object';
						}
					} catch (exception) {
						triggerPheryEvent($this, 'exception', [phery.log(exception, argv)]);
					}
				}
			}
			return obj;
		};

		if (data && countProperties(data)) {
			var x;
			for (x in data) {
				if (data.hasOwnProperty(x)) {
					is_selector = (x.toString().search(/^[0-9]+$/) === -1) || (x.toString() === '-') || (x.toString() === '~' || (x.toString().charAt(0) === '<'));
					/* check if it has a selector */

					if (is_selector) {
						if (data[x].length) {

							if (x.charAt(0) === '<') {
								$jq = $(x);
							} else if (x === '~') {
								$jq = $this;
							} else if (x === '-') {
								argv = data[x].shift();
								argv = argv['a'];
								$jq = phery.remote(argv[0], argv[1], argv[2], argv[3]);
							} else if (x === '#') {
								$jq = $;
							} else if (x.toLowerCase() === 'window') {
								$jq = $(window);
							} else if (x.toLowerCase() === 'document') {
								$jq = $(document);
							} else {
								$jq = $(x);
							}

							if (x === '#' || ($jq && typeof $jq['size'] !== 'undefined' && $jq.size())) {
								$jq = process($jq, data[x]);
							}
						} else {
							triggerPheryEvent($this, 'exception', [phery.log('no commands to issue, 0 length')]);
						}
					} else {
						argc = data[x]['a'].length;
						argv = data[x]['a'];

						switch (Number(data[x]['c'])) {
							/* alert */
							case 1:
								if (typeof argv[0] !== 'undefined') {
									alert(argv[0].toString());
								} else {
									triggerPheryEvent($this, 'exception', [phery.log('missing message for alert()', argv)]);
								}
								break;
							/* call */
							case 2:
								try {
									funct = argv.shift();
									if (typeof window[funct] === 'function') {
										window[funct].apply(null, argv[0] || []);
									} else {
										throw 'no global function "' + funct + '" found';
									}
								} catch (exception) {
									triggerPheryEvent($this, 'exception', [phery.log(exception, argv)]);
								}
								break;
							/* script */
							case 3:
								try {
									eval('(function(){ ' + argv[0] + ' })();');
								} catch (exception) {
									triggerPheryEvent($this, 'exception', [phery.log(exception, argv[0])]);
								}
								break;
							/* JSON */
							case 4:
								try {
									triggerPheryEvent($this, 'json', [$.parseJSON(argv[0])]);
								} catch (exception) {
									triggerPheryEvent($this, 'exception', [phery.log(exception, argv[0])]);
								}
								break;
							/* Render View */
							case 5:
								_data = $this.data('view.phery');
								_argv = $.extend(true, {}, {
									'url':$this.data('target')
								}, argv[1]);
								var _pass;

								if ($this.data('passdata.phery')){
									_pass = $this.data('passdata.phery');
									$.removeData($this[0], 'passdata.phery');
								} else {
									_pass = {};
								}

								if (typeof _data['beforeHtml'] === 'function') {
									_data['beforeHtml'].call($this, _argv, _pass);
								}

								if (typeof _data['render'] !== 'function') {
									$this.html('').html(argv[0]);
								} else {
									_data['render'].call($this, argv[0], _argv, _pass);
								}

								if (typeof _data['afterHtml'] === 'function') {
									_data['afterHtml'].call($this, _argv, _pass);
								}

								break;
							/* Dump var */
							case 6:
								try {
									if (typeof console !== 'undefined' && typeof console['log'] !== 'undefined') {
										for (var l = 0; l < argc; l++) {
											console.log(argv[l]);
										}
									}
								} catch (exception) {
									triggerPheryEvent($this, 'exception', [phery.log(exception, argv[0])]);
								}
								break;
							/* Trigger Exception */
							case 7:
								if (argc > 1) {
									_argv = [argv.shift()];

									do {
										_argv.push(argv.shift());
									} while (argv.length);

									triggerPheryEvent($this, 'exception', _argv);
								} else {
									triggerPheryEvent($this, 'exception', [argv[0]]);
								}
								break;
							/* Redirect (internal or external) */
							case 8:
								if (argc === 2) {
									if (argv[1])
									{
										phery.view(argv[1]).navigate_to(argv[0]);
									}
									else
									{
										window.location.assign(argv[0]);
									}
								}
								break;
							/* Set/Unset a global variable with any type of data */
							case 9:
								if (argc === 2) {
									window[argv[0]] = argv[1];
								} else if (argc === 1) {
									if (typeof window[argv[0]] !== 'undefined') {
										delete window[argv[0]];
									}
								}
								break;
							/* Access the current element phery() and set */
							case 10:
								var _local = $this.phery();
								if (typeof _local[argv[0]] === 'function') {
									_local[argv[0]].apply($this, argv[1] || null);
								} else {
									triggerPheryEvent($this, 'exception', [phery.log('invalid phery function "' + argv[0] + '"')]);
								}
								break;
							default:
								triggerPheryEvent($this, 'exception', [phery.log('invalid command "' + data[x]['c'] + '" issued')]);

								break;
						}
					}
				}
			}
		}

		triggerPheryEvent(this, 'after', []);
	}

	var dot_notation_option = function (val, step, set) {
		if (val.indexOf('.') !== -1) {
			var initial = val.split('.');
			if (initial && initial[0] && typeof step[initial[0]] !== 'undefined') {
				return dot_notation_option(initial.slice(1).join('.'), step[initial[0]], set);
			}
		} else if (typeof step[val] !== 'undefined') {
			if (typeof set !== 'undefined') {
				if (step[val].constructor === Array && typeof set === 'string') {
					step[val].push(set);
				} else {
					step[val] = set;
				}
				return step;
			} else {
				return step[val];
			}
		}
		return null;
	};

	function _apply(original, force) {
		force = force || false;

		for (var x in original) {
			if (original.hasOwnProperty(x)) {
				if (typeof original[x] === 'object' && original[x].constructor !== Array) {
					if (_apply(original[x], force) === false) {
						return false;
					}
				} else {
					debug(['config', {
						'name':x,
						'value':original[x]
					}], 'config');

					switch (x) {
						case 'confirm':
						case 'form':
						case 'select_multiple':
						case 'select':
						case 'tags':
							if (!compare_array(original[x], options.delegate[x]) || force) {
								set_events();
								return false;
							}
							break;
					}
				}
			}
		}

		return true;
	}

	function refresh_changes(key, value) {
		var
			original = $.extend(true, {}, options);

		if (typeof value === 'undefined') {
			for (var x in key) {
				if (key.hasOwnProperty(x)) {
					dot_notation_option(x, options, key[x]);
				}
			}
		} else {
			dot_notation_option(key, options, value);
		}

		_apply(original);
	}

	options = $.extend(true, {}, defaults, options);

	$(function () {
		$body_html = $('body,html');
		$original_cursor = $body_html.css('cursor');

		_apply(options, true);
	});

	/**
	 * Config phery singleton
	 * @param {String|Object} key name using dot notation (group.subconfig)
	 * @param {String|Boolean} value
	 * @return {phery}
	 */
	phery.config = function (key, value) {
		if (typeof key === 'object' && key.constructor === Object) {
			refresh_changes(key);
			return phery;
		} else if (typeof key === 'string' && typeof value !== 'undefined') {
			refresh_changes(key, value);
			return phery;
		} else if (typeof key === 'string' && typeof value === 'undefined') {
			if (key in options) {
				return options[key];
			}
			return dot_notation_option(key, options);
		} else if (arguments.length === 0) {
			return $.extend(true, {}, options);
		}
		return phery;
	};

	/**
	 * Reset everything to the defaults
	 * @return {phery}
	 */
	phery.reset_to_defaults = function () {
		options = $.extend(true, {}, defaults);
		_apply(options, true);
		return phery;
	};

	/**
	 * Log function
	 * @param {...} varargs Any type of data
	 * @return {String|Array}
	 */
	phery.log = function (varargs) {
		var
			args = Array.prototype.slice.call(arguments);

		if (args.length) {
			if (options.enable.log) {
				if (options.enable.log_history) {
					_log.push(args);
				}

				if (typeof console !== 'undefined' && typeof console['log'] !== 'undefined') {
					if (typeof console['log'] === 'object') {
						/* IE is still a malign force */
						console.log(args);
					} else {
						/* Good browsers */
						console.log.apply(console, args);
					}
				}
			}

			return args.join("\n");
		} else {
			if (options.enable.log_history) {
				return _log;
			}
		}

		return [];
	};

	/**
	 * Function to call remote
	 * @param {String} function_name Name of the PHP function set through
	 * <pre>
	 *    phery::instance()->set()
	 * </pre>
	 * @param {Object|null} [args] Optional Object containing arguments to be sent over. Set to null to skip it
	 * @param {Object|null} [attr] Optional Attributes to append to the created element. Set to null to skip it
	 * @param {Boolean} [direct_call] Default to true, call the AJAX function directly. If set to false, it
	 * will return the created object that will further need the remote() call, like after binding
	 * events to it.
	 * @return {jQuery.ajax|jQuery}
	 */
	phery.remote = function (function_name, args, attr, direct_call) {
		if (this === phery && !function_name) {
			phery.log('first argument "function_name" on phery.remote() must be specified when calling directly');
			return phery;
		}

		if (direct_call !== false) {
			direct_call = true;
		}

		if (this !== phery) {
			return ajax_call.call(this);
		}

		var $a = $('<a/>');

		$a.data({
			'remote.phery':function_name
		});

		if (direct_call) {
			$a.data('temp.phery', true);
		}

		if (typeof args !== 'undefined' && args !== null) {
			$a.phery('set_args', args);
		}

		if (typeof attr !== 'undefined' && attr !== null) {
			for (var i in attr) {
				if (attr.hasOwnProperty(i)) {
					if ('target method type'.indexOf(i.toLowerCase())) {
						$a.data(i + '.phery', attr[i]);
					} else {
						$a.attr(attr);
					}
				}
			}
		}

		return (direct_call ? ajax_call.call($a) : $a);
	};

	/**
	 * Set the global callbacks
	 * @param {Object|String} event Key:value containing events or string.
	 * <pre>
	 *    phery.on('always', fn); // or
	 *    phery.on({'always': fn});
	 * </pre>
	 * @param {Function} [cb] Callback for the event.
	 * @return {phery}
	 */
	phery.on = function (event, cb) {
		if (typeof event === 'object') {
			for (var x in event) {
				if (event.hasOwnProperty(x)) {
					phery.on(x, event[x]);
				}
			}
		} else if (typeof event === 'string' && typeof cb === 'function') {
			if (event in _callbacks) {
				debug(['phery.on', {
					event:event,
					callback:cb
				}], 'events');
				callbacks.bind(event + '.phery', cb);
			}
		}
		return phery;
	};

	/**
	 * Unset the callback
	 * @param {String} event Name of the event or space separated event names
	 * @return {phery}
	 */
	phery.off = function (event) {
		debug(['phery.off', {
			event:event
		}], 'events');
		callbacks.off(event + '.phery');
		return phery;
	};


	var
		_containers = {},
		PheryView = function(config){
			/**
			 * Container jQuery element
			 * @type {jQuery}
			 */
			this.container = config;

			/**
			 * Cloned data from jQuery.data('view.phery'), read-only
			 * @type {*}
			 */
			this.data = $.extend({}, this.container.data('view.phery'));

			var _excluded_url =
					function (href, urls) {
						for (var x = 0; x < urls.length; x++) {
							switch (typeof urls[x]) {
								case 'string':
									if (href.indexOf(urls[x]) !== -1) {
										return true;
									}
									break;
								case 'object':
									if (urls[x].test(href)) {
										return true;
									}
									break;
								case 'function':
									if (urls[x].call(null, href) === true) {
										return true;
									}
							}
						}
						return false;
					};

			/**
			 * Check if a given url is excluded by the view config
			 * @param {String} url Url to check if its excluded
			 * @return {boolean} If its excluded or not
			 */
			this.is_excluded_url = function (url) {
				var excludes = this.container.data('view.phery')['exclude'] || false;
				if (excludes && url) {
					return _excluded_url(url, excludes);
				}
				return false;
			};
			/**
			 * AJAX navigation and partial rendering
			 * @param {String} url URL to navigate inside the container
			 * @param {*} [args] Any extra arguments to pass through AJAX
			 * @param {*} [passdata] Any extra data to append after reaching the render, afterHtml, beforeHtml
			 * @return {jQuery.ajax}
			 */
			this.navigate_to = function (url, args, passdata) {
				if (url) {
					this.container.data('target', url);
				}
				var ajax;
				if (typeof passdata !== 'undefined') {
					this.container.data('passdata.phery', passdata);
				}
				if (typeof args !== 'undefined' && args !== null) {
					ajax = ajax_call.call(this.container, args);
				} else {
					ajax = ajax_call.call(this.container);
				}
				return ajax;
			};
		};

	/**
	 * Enable AJAX partials for the site. Disable links that responds
	 * to it using the <code>.no-phery</code> class
	 * @param {Object|String} config containing the #id references to containers and respective configs.
	 * <pre>
	 * {
	 *		'#container': {
	 *		// Optional, function to call before the
	 *		// HTML was set, can interact with existing elements on page
	 *		// The context of the callback is the container
	 *		// Passdata is a temp data that is kept between requests
	 *		'beforeHtml': function(data, passdata),
	 *		// Optional, function to call to render the HTML,
	 *		// in a custom way. This overwrites the original function,
	 *		// so you might set this.html(html) manually.
	 *		// The context of the callback is the container.
	 *		// Passdata is a temp data that is kept between requests
	 *		'render': function(html, data, passdata),
	 *		// Optional, function to call after the HTML was set,
	 *		// can interact with the new contents of the page
	 *		// The context of the callback is the container.
	 *		// Passdata is a temp data that is kept between requests
	 *		'afterHtml': function(data, passdata),
	 *		// Optional, defaults to a[href]:not(.no-phery,[target],[data-remote],[href*=":"],[rel~="nofollow"]).
	 *		// Setting the selector manually will make it 'local' to the #container, like '#container a'
	 *		// Links like <a rel="#nameofcontainer">click me!</a>, using the rel attribute will trigger too
	 *		'selector': 'a',
	 *		// Optional, array containing conditions for links NOT to follow,
	 *		// can be string, regex and function (that returns boolean, receives the url clicked, return true to exclude)
	 *		'exclude': ['/contact', /\d$/, function]
	 *		// any other phery event, like beforeSend, params, etc
	 *		}
	 * }
	 * </pre>
	 * If you provide a string as the name of previously
	 * set container, it will return an object associated
	 * with the container as follows:
	 * <pre>
	 * {
	 *      'data': container.data,			// selector, callbacks, etc
	 *      'container': $(container),		// jquery container itself
	 *      'remote': function(url),		// function to navigate to url set
	 *      'is_excluded_url': function(url)// check if the URL is excluded
	 * }
	 * </pre>
	 * If you pass false value to the container, it will remove the view from the id
	 * <pre>
	 * phery.view({'#container':false});
	 * </pre>
	 * @return {PheryView|phery}
	 */
	phery.view = function (config) {
		if (typeof config === 'string') {
			if (config.charAt(0) !== '#') {
				config = '#' + config;
			}
			if (typeof _containers[config] !== 'undefined') {
				return _containers[config];
			} else {
				return phery;
			}
		}

		if (typeof config === 'object' && $.isEmptyObject(config)) {
			debug(['phery.view needs config'], 'config');
			return phery;
		}

		var
			_container,
			_bound,
			$container,
			selector,
			event = function (e) {
				/* Prepare */
				var
					$this = $(this),
					href = $this.attr('href');

				/* Continue as normal for cmd clicks etc */
				if (e.which === 2 || e.metaKey) {
					return true;
				}

				if (e.data.is_excluded_url(href))
				{
					return true;
				}

				debug([
					'phery.view link clicked, loading content',
					e.data.container,
					$this.attr('href')
				], 'events');

				e.data.navigate_to($this.attr('href'));

				e.stopPropagation();
				e.preventDefault();
				return false;
			};

		$(document)
			.off('click.view');

		for (_container in config) {
			if (config.hasOwnProperty(_container)) {
				$container = $(_container);

				if ($container.size() === 1) {
					_bound = _container.replace(/[#\.\s]/g, '');

					if (config[_container] === false) {
						/* Remove the view */

						$container.off('.phery.view');
						$(document).off('click.view.' + _bound);

						debug(['phery.view uninstalled and events unbound', $container], 'config');
						continue;
					}

					if (
						typeof config[_container]['selector'] === 'string' &&
						/(^|\s)a($|\s|\.)/i.test(config[_container]['selector'])
						) {
						selector = _container + ' ' + config[_container]['selector'];
					} else {
						selector = 'a[href]:not(.no-phery,[target],[data-remote],[href*=":"],[rel~="nofollow"])';
					}

					selector = selector + ',a[href][rel="' + (_container) + '"]';

					$container.data('view.phery', $.extend(true, {}, config[_container], {
						'selector':selector
					}));

					_containers[_container] = new PheryView($container);

					$(document)
						.on('click.view.' + _bound, selector, _containers[_container], event);

					for (var _x in config[_container]) {
						if (config[_container].hasOwnProperty(_x) && typeof _callbacks[_x] !== 'undefined') {
							$container.on('phery:' + (_x) + '.phery.view', config[_container][_x]);
						}
					}

					debug(['phery.view installed', $container], 'config');
				} else {
					debug(['phery.view container', $container, 'isnt unique or does not exist'], 'config');
				}
			}
		}

		return phery;
	};

	$.fn.extend({
		reset:function () {
			return this.each(function () {
				if ($(this).is('form')) {
					this.reset();
				}
			});
		},
		phery:function (name, value) {
			var
				$this = this,
				_out = {
					/**
					 * Trigger phery exception on the element
					 *
					 * @param {String} msg
					 * @param {*} data
					 * @return {jQuery}
					 */
					'exception':function (msg, data) {
						return $this.each(function(){
							var $this = $(this);
							triggerPheryEvent($this, 'exception', [msg, data]);
						});
					},
					/**
					 * Call the bound remote function on the element
					 * @return {jQuery.ajax}
					 */
					'remote':function () {
						if ($this.is('form')) {
							return form_submit($this);
						} else {
							return ajax_call.call($this);
						}
					},
					/**
					 * Append arguments to the element
					 * @param {...} varargs
					 * @return {Object}
					 */
					'append_args':function (varargs) {
						var args = Array.prototype.slice.call(arguments);
						$this.each(function(){
							var $this = $(this);
							append_args.apply($this, [args]);
						});
						return _out;
					},
					/**
					 * Set the arguments of the element. Prefer using objects or arrays
					 * @param {*} args
					 * @return {Object}
					 */
					'set_args':function (args) {
						$this.each(function(){
							var $this = $(this);
							set_args.call($this, [args]);
						});
						return _out;
					},
					/**
					 * Current element arguments
					 *
					 * @return {*}
					 */
					'get_args':function () {
						return $this.data('args.phery');
					},
					'remove':function () {
						$this.each(function(){
							var $this = $(this);
							$this.data('temp.phery', true);
							clean_up($this);
						});
					},
					/**
					 * Make the current elements ajaxified
					 *
					 * @param {String} func Name of the AJAX function
					 * @param {*} args Arguments
					 * @return {jQuery}
					 */
					'make':function(func, args) {
						if (Object.toType(func) === 'string') {
							return $this.each(function(){
								var $this = $(this);
								$this.attr('data-remote', func);
								if (args) {
									set_args.call($this, [args]);
								}
							});
						}
						return $this;
					}
				};

			if (name && (name in _out)) {
				return _out[name].apply($this, Array.prototype.slice.call(arguments, 1));
			}
			return _out;
		},
		serializeForm:function (opt) {
			opt = $.extend({}, opt);

			if (typeof opt['disabled'] === 'undefined' || opt['disabled'] === null) {
				opt['disabled'] = false;
			}
			if (typeof opt['all'] === 'undefined' || opt['all'] === null) {
				opt['all'] = false;
			}
			if (typeof opt['empty'] === 'undefined' || opt['empty'] === null) {
				opt['empty'] = true;
			}

			var
				$form = $(this),
				result = {},
				formValues =
					$form
						.find('input,textarea,select,keygen')
						.filter(function () {
							var ret = true;
							if (!opt['disabled']) {
								ret = !this.disabled;
							}
							return ret && $.trim(this.name);
						})
						.map(function () {
							var
								$this = $(this),
								radios,
								options,
								value = null;

							if ($this.is('[type="radio"]') || $this.is('[type="checkbox"]')) {
								if ($this.is('[type="radio"]')) {
									radios = $form.find('[type="radio"][name="' + this.name + '"]');
									if (radios.filter('[checked]').size()) {
										value = radios.filter('[checked]').val();
									}
								} else if ($this.prop('checked')) {
									value = $this.is('[value]') ? $this.val() : 1;
								}
							} else if ($this.is('select')) {
								options = $this.find('option').filter(':selected');
								if ($this.prop('multiple')) {
									value = options.map(function () {
										return this.value || this.innerHTML;
									}).get();
								} else {
									value = options.val();
								}
							} else {
								value = $this.val();
							}

							return {
								'name':this.name || null,
								'value':value
							};
						}).get();

			if (formValues) {
				var
					i,
					value,
					name,
					res = {},
					$matches,
					len,
					j,
					x,
					fields,
					_count = 0,
					last_name,
					strpath;

				var create_obj = function (create_array, res, path) {
					var
						field = fields.shift();

					if (field) {
						if (typeof res[field] === "undefined" || !res[field]) {
							res[field] = (create_array ? [] : {});
						}
						path.push("['" + field + "']");
						create_obj(create_array, res[field], path);
					} else {
						if (typeof field === 'string') {
							var count = (_count++).toString();

							path.push("['" + (count) + "']");
							if (typeof res[count] === "undefined" || !res[count]) {
								res[count] = {};
							}
							create_obj(create_array, res[count], path);
						}
					}
				};

				for (i = 0; i < formValues.length; i++) {
					name = formValues[i].name;
					value = formValues[i].value;

					if (!opt['all']) {
						if (value === null) {
							continue;
						}
					} else {
						if (value === null) {
							value = '';
						}
					}

					if (value === '' && !opt['empty']) {
						continue;
					}

					if (!name) {
						continue;
					}

					$matches = name.split(/\[/);

					len = $matches.length;

					for (j = 1; j < len; j++) {
						$matches[j] = $matches[j].replace(/\]/g, '');
					}

					fields = [];
					strpath = [];

					for (j = 0; j < len; j++) {
						if ($matches[j] || j < len - 1) {
							fields.push($matches[j].replace("'", ''));
						}
					}

					if ($matches[len - 1] === '') {

						if ($matches[0] !== last_name) {
							last_name = $matches[0];
							_count = 0;
						}

						create_obj(true, result, strpath);

						eval('res=result' + strpath.join('') + ';');

						if (value.constructor === Array) {
							for (x = 0; x < value.length; x++) {
								res.push(value[x]);
							}
						} else {
							res.push(value);
						}
					} else {
						create_obj(false, result, strpath);

						eval('result' + strpath.join('') + '=value;');
					}
				}
			}

			return result;
		}
	});

}(jQuery, window));
