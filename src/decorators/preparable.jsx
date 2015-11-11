const $prepare = Symbol('preparable');

function preparable(prepare) {
  function $preparable(Component) {
    class $Preparable extends Component {
      static [$prepare](props) {
        if(Component[$prepare]) {
          return Promise.all([Component[$prepare](props), prepare(props)]);
        }
        return prepare(props);
      }
    }

    return $Preparable;
  }

  return $preparable;
}

Object.assign(preparable, { $prepare });

export default preparable;
