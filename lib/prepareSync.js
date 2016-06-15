import Promise from 'bluebird';
import React from 'react';
import _ from 'lodash';

import isExtensionOf from './util/isExtensionOf';
import preparable from './preparable';
const { $prepare } = preparable;

/**
 * Create a new `React.Component` instance on which {render} can then be called.
 * Should be disposed of using {dispose}.
 * It will apply the instances' `componentWillMount` lifecycle  method, if present.
 * @param {Function} Component Component class to instanciate
 * @param {Object} [props={}] props for the instance
 * @param {Object} [context={}] context for the instance
 * @return {React.Component} Instantiated component
 */
function create(Component, props = {}, context = {}) {
  const inst = new Component(props, context);
  if(inst.componentWillMount) {
    // console.log('componentWillMount', inst.constructor.displayName)
    inst.componentWillMount();
  }
  return inst;
}

/**
 * Renders a given `React.Component` instance previously created by `create`, computes its child context,
 * and returns both.
 * @param {React.Component} inst Component instance
 * @param {Object} context Default context
 * @return {Array} Pair containing the rendered children and the child context
 */
function render(inst, context = {}) {
  return [inst.render(), inst.getChildContext ? inst.getChildContext() : context];
}

/**
 * Dispose of a given `React.Component` instance created using `create`.
 * It will call its `componentWillUnmount` lifecycle method, if present.
 * @param {React.Component} inst Instance to dipose of
 * @return {undefined}
 */
function dispose(inst) {
  if(inst.componentWillUnmount) {
    // console.log('componentWillUnmount', inst.constructor.displayName)
    inst.componentWillUnmount();
  }
}

/**
 * Asynchronously satisfy the dependencies of a React.Element: if it decorated with {@preparable},
 * and otherwise immediatly resolves.
 * @param {React.Element} element Element whose deps must be satisfied
 * @param {Object?} context React Context in which to satisfy the deps
 * @return {Promise} Promise for the settlement of the elements' dependencies.
 */
function satisfy(element, context) {
  const { type, props } = element;
  if(type[$prepare]) {
    return type[$prepare](props, context);
  }
  return [];
}

function createRenderDispose(type, props, context) {
  let inst = null;
  // try {
    inst = create(type, props, context);
    return render(inst, context);
  // }
  // finally {
  //   if(inst !== null) {
  //     dispose(inst);
  //   }
  // }
}

/**
 * Asynchronously satisfies the own deps of an element (i.e. not including its children's).
 * This can induce side effects in the context, depending of the implementation of the `[$prepare]` method of this
 * element. Once the deps are satisfied, renders the children of this element and returns them (render can now safely be
 * called on the element since its own deps have been resolved).
 * @param {React.Element} element Element whose own deps will be satisfied and which will be rendered
 * @param {Object} context Context in which to apply side effects/render
 * @return {Promise} Promise for an Array containing the rendered children and the child rendering context.
 */
function prepareElement(element, context) {
  // Plain value child element
  if(element === null || typeof element !== 'object') {
    return [null, context];
  }
  const { type, props } = element;
  // Native element
  if(typeof type === 'string') {
    return [props.children, context];
  }
  // Function component (new in react 0.14.x)
  if(!isExtensionOf(type, React.Component)) {
    return [type(props), context];
  }

  // Composite element
  const promises = satisfy(element, context);
  if(promises.length === 0) {
    syncCount++
    return createRenderDispose(type, props, context);
  }
  asyncCount++
  return Promise.all(promises).then(() => createRenderDispose(type, props, context))
}

/**
 * Asynchronously and recursively prepare a context for rendering an element.
 * Namely, it will recursively satisfy the deps of the element (which can induce
 * side-effects on the context, eg. populate Flux instances), then render its children.
 * When the returned promise resolves, React `render*` can safely be called and won't need
 * additional data.
 * @param {React.Element} element Element whose rendering will be prepared
 * @param {Object} context = {} Context in which to render/apply side effects
 * @return {Promise} Promise for the (possibly altered) context of the rendered tree
 */
// async function prepareRecur(element, context = {}) {
//   const [children, childContext] = await prepareElement(element, context);
//   await Promise.map(React.Children.toArray(children), (child) => prepareRecur(child, childContext));
//   return context;
// }



function recurOnChildren([children, childContext]) {
  const promises = React.Children.toArray(children)
    .map((child) => prepareRecurSync(child, childContext))
    .filter((maybePromise) => _.isFunction(_.get(maybePromise, 'then')));
  if(promises.length === 1) {
    // TODO: useless optimization?
    return promises[0];
  }
  if(promises.length >= 1) {
    return Promise.all(promises);
  }
  return void 0;
};

function prepareRecurSync(element, context = {}) {
  const childrenOrPromiseOfChildren = prepareElement(element, context);
  if(_.isFunction(_.get(childrenOrPromiseOfChildren, 'then'))) {
    return childrenOrPromiseOfChildren.then(recurOnChildren)
  }
  return recurOnChildren(childrenOrPromiseOfChildren)
}




var syncCount = 0;
var asyncCount = 0;
import fs from 'fs';
import profiler from 'v8-profiler';
const runTimestamp = Date.now();

async function prepare(...args) {
  const profile = true;
  // const a = prepareRecurSync(...args);
  // _.isNil(a) ? a : await a;

  syncCount = 0;
  asyncCount = 0;

  profile && profiler.startProfiling();
  console.time('prepare')

  const promiseOrNil = prepareRecurSync(...args);
  console.log('prepare', typeof promiseOrNil)
  const promise = _.isNil(promiseOrNil) ? promiseOrNil : await promiseOrNil;

  console.timeEnd('prepare');
  const profilerStream = profile && profiler.stopProfiling();
  profile && profilerStream.export((error, result) => {
    fs.writeFileSync(`/tmp/prepare${runTimestamp}.cpuprofile`, result);
    profilerStream.delete();
  });

  console.log('syncCount:', syncCount)
  console.log('asyncCount:', asyncCount)
}

export default prepare;
