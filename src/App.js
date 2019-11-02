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
    this.onBoard = true;
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

const Cardcomp = props => {
  if (props.card) {
    return (
      <button disabled={!props.canMove} onClick={props.onClick}>
        {props.card.suit}{props.card.value || ''}
        {!props.card.onBoard && '*'}
      </button>
    )
  }
  return (
    <button onClick={props.onClick}>
      Empty
    </button>
  )
}
  

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
        {this.props.cards.map((card, i) => <li><Cardcomp card={card} canMove={this.canMove(i)} onClick={this.props.onCardClick(i)} /></li>)}
      </ul>
    )
  }
}

const Hand = (props) => props.cards.map(card => <Cardcomp card={card} canMove={false} onClick={console.log('clicked')} />)

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: deal(),
      freeCells: [null, null, null],
      flower: null,
      home: [null, null, null],
      inMotion: null,
    }

    this.handleColumnClick = this.handleColumnClick.bind(this);
    this.handleFreeCellClick = this.handleFreeCellClick.bind(this);
  }

  handleColumnClick = columnIndex => cardIndex => () =>{
    const {columns, inMotion} = this.state;
    const pickedColumn = columns[columnIndex];
    const card1 = (inMotion && inMotion[0]) || null;
    const card2 = pickedColumn[cardIndex];

    const isValidMove = () =>
      pickedColumn.length - 1 === cardIndex && isValidChild(card1, card2)

    const newColumn = inMotion
    ? isValidMove()
      ? pickedColumn.concat(inMotion)
      : pickedColumn
    : pickedColumn.map(({onBoard, ...card}, index) => (index < cardIndex && {onBoard, ...card}) || {onBoard: false, ...card});

    const newInMotion = inMotion
    ? isValidMove()
      ? null
      : inMotion
    : pickedColumn.slice(cardIndex, pickedColumn.length);

    const newColumns = (inMotion && isValidMove())
    ? columns.map((column, i) => 
        columnIndex === i 
        ? newColumn 
        : column.filter(card => card.onBoard) // remove inMotion cards from table
      )
    : columns.map((column, i) =>
        columnIndex === i
        ? newColumn
        : column
      )

    this.setState({
      inMotion: newInMotion,
      columns: newColumns,
    })
  }

  handleFreeCellClick = cellIndex => () => {
    // if cell is empty and inMotion card length = 1, move inmotion into cell
    // if cell is occupied and no inmotion cards, move card into inMotion * caveat doesn't work if cell contains set of dragons
    // if cell is occupied and inMotion cards in play, do nothing
    const {freeCells, inMotion} = this.state;
    const cell = freeCells[cellIndex];  
    
    const newCellState = (!cell && inMotion && inMotion.length === 1 && inMotion[0]) || 
      (inMotion && cell) ||
      null;
    const newInMotion = 
      (cell && inMotion) || // cell already occupied
      (inMotion && inMotion.length > 1 && inMotion) || // hand too big to move into cell
      (cell && [cell]) || // hand free to take cell
      null;

    const newFreeCells = freeCells.map((cell, i) => i === cellIndex ? newCellState : cell);

    // todo update table
    // update 

    this.setState({
      freeCells: newFreeCells,
      inMotion: newInMotion,
    })

  }

  render() {
    const {columns, freeCells, flower, home, inMotion} = this.state;
    return (
      <div>
        <table>
          <tr>
            {freeCells.map((cell, i) => <td><Cardcomp card={cell} canMove={true} onClick={this.handleFreeCellClick(i)} /></td>)}
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
            {columns.map((column, i) => <td><Column cards={column} onCardClick={this.handleColumnClick(i)} /></td>)}
          </tr>
        </table>
        {inMotion && <Hand cards={inMotion} />}
        
      </div>
    )
  }
}

export default App;
