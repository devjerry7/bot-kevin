// utils/timeout.js
const timeouts = new Set();

// Como o bot opera em um único servidor, usamos apenas o ID do membro como chave.
const addMemberToTimeout = (member, time) => {
  timeouts.add(member.id);

  setTimeout(() => {
    timeouts.delete(member.id);
  }, time);
};

const isMemberTimeouted = (member) => {
  return timeouts.has(member.id);
};

module.exports = { addMemberToTimeout, isMemberTimeouted };
