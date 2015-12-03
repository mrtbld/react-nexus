import React, { PropTypes } from 'react';
import _ from 'lodash';

import { inject, isPending, lastErrorOf, lastValueOf, LocalFlux, HTTPFlux } from '../../../';

const USERS_REFRESH_PERIOD = 5000;

// Helper components

function Users({ users }) {
  if(isPending(users)) {
    return <p>Loading users...</p>;
  }
  const [err, val] = [lastErrorOf(users), lastValueOf(users)];
  if(err) {
    return <p>{err.toString()}</p>;
  }
  return <p>Total users: {val.items.length}</p>;
}

function UserProfile({ user, following, followUser }) {
  if(isPending(user)) {
    return <p>Loading user...</p>;
  }
  const [err, val] = [lastErrorOf(user), lastValueOf(user)];
  if(err) {
    return <p>{err.toString()}</p>;
  }
  const { userName, profilePicture } = val;
  return <p>
    Username {userName} <img src={profilePicture} />
    <FollowButton following={following} onClick={followUser} />
  </p>;
}

function FollowButton({ following, onClick }) {
  if(!following || following.isPending()) {
    return <button disabled={following && following.isPending()} onClick={onClick} >
      Follow user
    </button>;
  }
  if(following.isRejected()) {
    return <p>{following.reason().toString()}</p>;
  }
  return <p>{following.value().toString()}</p>;
}

const userPropType = PropTypes.shape({
  userId: PropTypes.string.isRequired,
  userName: PropTypes.string.isRequired,
  profilePicture: PropTypes.string.isRequired,
  follows: PropTypes.arrayOf(PropTypes.string).isRequired,
});

export default _.flow(
  inject(({ local }) => ({
    authToken: local.get('/authToken'),
    fontSize: local.get('/fontSize'),
  })),
  inject(({ http, local }, { userId, authToken }) => ({
    error: http.get('/error'),
    http,
    local,
    me: http.get(`/me`, { query: { authToken: lastValueOf(authToken) } }),
    user: http.get(`/users/${userId}`),
    users: http.get(`/users`),
  }))
)(class User extends React.Component {
  static displayName = 'User';
  static propTypes = {
    authToken: PropTypes.string.isRequired,
    fontSize: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    http: PropTypes.instanceOf(HTTPFlux).isRequired,
    local: PropTypes.instanceOf(LocalFlux).isRequired,
    me: userPropType.isRequired,
    user: userPropType.isRequired,
    userId: PropTypes.string.isRequired,
    users: PropTypes.shape({
      items: PropTypes.arrayOf(userPropType),
    }).isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {};
    this.refreshUsers = null;
  }

  componentDidMount() {
    const { http } = this.props;
    this.refreshUsers = setInterval(() => http.dispatch('refresh users'), USERS_REFRESH_PERIOD);
  }

  componentWillUnmount() {
    if(this.refreshUsers !== null) {
      clearInterval(this.refreshUsers);
    }
  }

  followUser() {
    const { userId, authToken, http } = this.props;
    this.setState({
      following: http.dispatch('follow user', {
        userId: lastValueOf(userId),
        authToken: lastValueOf(authToken),
      }),
    });
  }

  updateFontSize(e) {
    e.preventDefault();
    const { local } = this.props;
    local.dispatch('set font size', { fontSize: e.target.value });
  }

  render() {
    const { fontSize, users, user } = this.props;
    const { following } = this.state;
    return <div style={{ fontSize: lastValueOf(fontSize) }}>
      <Users users={users} />
      <UserProfile followUser={() => this.followUser()} following={following} user={user} />
      <div>modify font size:
        <input onChange={(e) => this.updateFontSize(e)} type='text' value={lastValueOf(fontSize)} />
      </div>
    </div>;
  }
});
