import React from 'react';
import './App.css';

const createDeck = () => {
  const suits = ['A', 'B', 'C'];
  const dragons = ['X', 'Y', 'Z'];
  const numbers = [...Array(10).keys()].slice(1);

  // a deck is made up of 4 of each dragon, 1-9 for each suit and a flower card
  const cards = [
    dragons.map(x => Array(4).fill(new Card(x))),
    suits.map(x => numbers.map(y => new Card(x, y))),
    new Card('@'), // flower card
  ].flat(2);
  return cards;
}

const shuffleDeck = cards => {
  // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
  return cards.reduce((a, v) => a.splice(Math.floor(Math.random() * a.length), 0, v) && a, []);
}

const deal = () => {
  // send cards to 8 columns
  const cards = shuffleDeck(createDeck());
  const cols = [...Array(8).keys()];
  const board = cols.map(x => cards.filter((_, i) => (i + x) % 8 === 0));
  return board;
}

class Card {
  constructor(suit, value=0) {
    this.suit = suit;
    this.value = value;
  }
}

// card1 is valid child of card2: this means card1 and card2 are both numeric cards with different suits
// and card1's value is exactly 1 less than card2's value
const isValidChild = (card1, card2) =>
  card1.suit !== card2.suit && card1.value === card2.value-1;

//const isValidMove = (card1, card2) =>
  /* refine this for all cases?
  single card to single card on main board
  ordered stack to single card on main board
  card/stack to empty column
  single card to free cell
  valid next card to home position
  collect 4 free dragons to single free cell */

const Cardcomp = props =>
  <button disabled={!props.canMove}>
    {props.card.suit}{props.card.value || ''}
  </button>

const Empty = () =>
  <button>Empty</button>

class Column extends React.Component {
  canMove(index) {
    return index === (this.props.cards.length - 1) || 
      (isValidChild(this.props.cards[index+1], this.props.cards[index]) && this.canMove(index + 1));
  }
  
  render() {
    return (
      <ul>
        {this.props.cards.map((card, i) => <li><Cardcomp card={card} canMove={this.canMove(i)} /></li>)}
      </ul>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: deal(),
      freeCells: [null, null, null],
      flower: null,
      home: [null, null, null],
    }
  }

  render() {
    const {columns, freeCells, flower, home} = this.state;
    return (
      <div>
        <table>
            <tr>
              {freeCells.map(cell => (cell && <td><Cardcomp card={cell} /></td>) || <td><Empty /></td>)}
            </tr>
          </table>
          <table>
            <tr>
              <td>{(flower && <Cardcomp card={flower} />) || <Empty />}</td>
            </tr>
          </table>
          <table>
            <tr>
              {home.map(cell => (cell && <td><Cardcomp card={cell} /></td>) || <td><Empty /></td>)}
            </tr>
          </table>
          <table>
            <tr>
              {columns.map(column => <td><Column cards={column} /></td>)}
            </tr>
          </table>
      </div>
    )
  }
}

export default App;
