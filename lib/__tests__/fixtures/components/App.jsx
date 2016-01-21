import React from 'react';

import Nexus from '../../..';
const { root } = Nexus;
import Users from './Users';

export default root(({ createFlux }) => createFlux())(class App extends React.Component {
  static displayName = 'App';

  render() {
    return <div className='App'>
      <Users />
    </div>;
  }
});
