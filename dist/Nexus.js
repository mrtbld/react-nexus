'use strict';

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { 'default': obj }; };

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _React = require('react/addons');

var _React2 = _interopRequireWildcard(_React);

var _instanciateReactComponent = require('react/lib/instantiateReactComponent');

var _instanciateReactComponent2 = _interopRequireWildcard(_instanciateReactComponent);

var _Mixin = require('./Mixin');

var _Mixin2 = _interopRequireWildcard(_Mixin);

var _Flux = require('nexus-flux');

var _Flux2 = _interopRequireWildcard(_Flux);

require('babel/polyfill');
var _ = require('lodash');
var should = require('should');
var Promise = (global || window).Promise = require('bluebird');
var __DEV__ = process.env.NODE_ENV !== 'production';
var __PROD__ = !__DEV__;
var __BROWSER__ = typeof window === 'object';
var __NODE__ = !__BROWSER__;
if (__DEV__) {
  Promise.longStackTraces();
  Error.stackTraceLimit = Infinity;
}
var Remutable = _Flux2['default'].Remutable;
var Lifespan = _Flux2['default'].Lifespan;

// if 'vanilla' isCompositeComponentElement is available, then use it,
// otherwise use this polyfill. (this is required since the vanilla version
// isn't shipped in the production build)

function isCompositeComponentElementPolyfill(element) {
  if (!_React2['default'].isValidElement(element)) {
    return false;
  }
  var prototype = element.type.prototype;

  // @see https://github.com/facebook/react/blob/master/src/test/ReactTestUtils.js#L86-L97
  return _.isFunction(prototype.render) && _.isFunction(prototype.setState);
}

var isCompositeComponentElement = _React2['default'].addons && _React2['default'].addons.TestUtils && _React2['default'].addons.TestUtils.isCompositeComponentElement && _.isFunction(_React2['default'].addons.TestUtils.isCompositeComponentElement) ? _React2['default'].addons.TestUtils.isCompositeComponentElement : isCompositeComponentElementPolyfill;

// flatten the descendants of a given element into an array
// use an accumulator to avoid lengthy lists construction and merging.
function flattenDescendants(element) {
  var acc = arguments[1] === undefined ? [] : arguments[1];

  if (__DEV__) {
    acc.should.be.an.Array;
  }
  if (!_React2['default'].isValidElement(element)) {
    // only pass through valid elements
    return acc;
  }
  acc.push(element);
  if (element.props && element.props.children) {
    _React2['default'].Children.forEach(element.props.children, function (child) {
      return flattenDescendants(child, acc);
    });
  }
  return acc;
}

// A nexus object is just a collection of Flux.Client objects.

var Nexus = {
  // expose internal libs
  Lifespan: Lifespan,
  React: _React2['default'],
  Remutable: Remutable,

  Mixin: null, // reference to the Nexus React mixin

  // A global reference to the current nexus context, mapping keys to Flux client objects
  // It is set temporarly in the server during the prefetching/prerendering phase,
  // and set durably in the browser during the mounting phase.
  currentNexus: null,

  shouldPrefetch: function shouldPrefetch(element) {
    return _React2['default'].isValidElement(element) && _.isFunction(element.type) && isCompositeComponentElement(element);
  },

  // In the server, prefetch, then renderToString, then return the generated HTML string and the raw prefetched data,
  // which can then be injected into the server response (eg. using a global variable).
  // It will be used by the browser to call mountApp.
  prerenderApp: function prerenderApp(rootElement, nexus) {
    return Promise['try'](function () {
      if (__DEV__) {
        _React2['default'].isValidElement(rootElement).should.be['true'];
        nexus.should.be.an.Object;
        __NODE__.should.be['true'];
        _.each(nexus, function (flux) {
          return flux.should.be.an.instanceOf(_Flux2['default'].Client);
        });
      }
      return Nexus._prefetchApp(rootElement, nexus).then(function (data) {
        _.each(nexus, function (flux, key) {
          return flux.startInjecting(data[key]);
        });
        var html = Nexus._withNexus(nexus, function () {
          return _React2['default'].renderToString(rootElement);
        });
        _.each(nexus, function (flux) {
          return flux.stopInjecting();
        });
        return [html, data];
      });
    });
  },

  prerenderAppToStaticMarkup: function prerenderAppToStaticMarkup(rootElement, nexus) {
    return Promise['try'](function () {
      if (__DEV__) {
        _React2['default'].isValidElement(rootElement).should.be['true'];
        nexus.should.be.an.Object;
        __NODE__.should.be['true'];
        _.each(nexus, function (flux) {
          return flux.should.be.an.instanceOf(_Flux2['default'].Client);
        });
      }
      return Nexus._prefetchApp(rootElement, nexus).then(function (data) {
        _.each(nexus, function (flux, key) {
          return flux.startInjecting(data[key]);
        });
        var html = Nexus._withNexus(nexus, function () {
          return _React2['default'].renderToStaticMarkup(rootElement);
        });
        _.each(nexus, function (flux) {
          return flux.stopInjecting();
        });
        return [html, data];
      });
    });
  },

  // In the client, mount the rootElement using the given nexus and the given prefetched data into
  // the given domNode. Also globally and durably set the global nexus context.
  mountApp: function mountApp(rootElement, nexus, data, domNode) {
    if (__DEV__) {
      _React2['default'].isValidElement(rootElement).should.be['true'];
      nexus.should.be.an.Object;
      data.should.be.an.Object;
      domNode.should.be.an.Object;
      __BROWSER__.should.be['true'];
      _.each(nexus, function (flux) {
        return flux.should.be.an.instanceOf(_Flux2['default'].Client);
      });
      (Nexus.currentNexus === null).should.be['true'];
    }
    Nexus.currentNexus = nexus;
    _.each(nexus, function (flux, key) {
      return flux.startInjecting(data[key]);
    });
    var r = _React2['default'].render(rootElement, domNode);
    _.each(nexus, function (flux, key) {
      return flux.stopInjecting(data[key]);
    });
    return r;
  },

  // Temporarly set the global nexus context and run a synchronous function within this context
  _withNexus: function _withNexus(nexus, fn) {
    var previousNexus = Nexus.currentNexus;
    Nexus.currentNexus = nexus;
    var r = fn();
    Nexus.currentNexus = previousNexus;
    return r;
  },

  // In the server, prefetch the dependencies and store them in the nexus as a side effect.
  // It will recursively prefetch all the nexus dependencies of all the components at the initial state.
  _prefetchApp: function _prefetchApp(rootElement, nexus) {
    return Promise['try'](function () {
      if (__DEV__) {
        _React2['default'].isValidElement(rootElement).should.be['true'];
        nexus.should.be.an.Object;
        __NODE__.should.be['true'];
      }
      _.each(nexus, function (flux) {
        return flux.startPrefetching();
      });
      return Nexus._prefetchElement(rootElement, nexus);
    }).then(function () {
      return _.mapValues(nexus, function (flux) {
        return flux.stopPrefetching();
      });
    });
  },

  // Within a prefetchApp async stack, prefetch the dependencies of the given element and its descendants
  // it will:
  // - instanciate the component
  // - call componentWillMount
  // - yield to prefetch nexus bindings (if applicable)
  // - call render
  // - call componentWillUnmount
  // - yield to recursively prefetch descendant elements
  _prefetchElement: function _prefetchElement(element, nexus) {
    return Promise['try'](function () {
      if (__DEV__) {
        _React2['default'].isValidElement(element).should.be['true'];
        nexus.should.be.an.Object;
        __NODE__.should.be['true'];
      }
      if (Nexus.shouldPrefetch(element)) {
        return Nexus._withNexus(nexus, function () {
          var instance = _instanciateReactComponent2['default'](element);
          // if the component isn't a React Nexus component, then do nothing
          if (instance.prefetchNexusBindings === void 0) {
            return Promise.resolve(instance);
          }
          // if the component opts out of prefetching, then do nothing
          if (instance.shouldComponentPrefetchNexusBindings && !instance.shouldComponentPrefetchNexusBindings()) {
            return Promise.resolve(instance);
          }
          return instance.prefetchNexusBindings();
        }).then(function (instance) {
          return Nexus._withNexus(nexus, function () {
            instance.state = instance.getInitialState ? instance.getInitialState() : {};
            if (instance.componentWillMount) {
              instance.componentWillMount();
            }
            var renderedElement = instance.render ? instance.render() : null;
            return Promise.all(_.map(flattenDescendants(renderedElement), function (descendantElement) {
              return Nexus._prefetchElement(descendantElement, nexus);
            }));
          });
        });
      }
    });
  } };

Nexus.Mixin = _Mixin2['default'](Nexus);

exports['default'] = Nexus;
module.exports = exports['default'];