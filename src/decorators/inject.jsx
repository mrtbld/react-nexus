import React from 'react';

import $nexus from '../$nexus';
import Injector from '../components/Injector';
import pureShouldComponentUpdate from '../utils/pureShouldComponentUpdate';
import validateNexus from '../utils/validateNexus';

function inject(getInjected, customShouldComponentUpdate = pureShouldComponentUpdate) {
  function $inject(Component) {
    class $Inject extends React.Component {
      static displayName = `@Nexus.inject(${Component.displayName})`;
      static contextTypes = {
        [$nexus]: validateNexus,
      };

      shouldComponentUpdate(...args) {
        return Reflect.apply(customShouldComponentUpdate, this, args);
      }

      render() {
        const { props, context } = this;
        const nexus = context[$nexus];
        const injected = getInjected(nexus, props);
        return <Injector {...injected}>{(injectedProps) => {
          const childProps = Object.assign({}, props, injectedProps);
          return <Component {...childProps} />;
        }}</Injector>;
      }
    }

    return $Inject;
  }

  return $inject;
}

export default inject;
