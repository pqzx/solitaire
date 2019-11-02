import React from 'react';
import './App.css';

const suits = ['A', 'B', 'C'];
const dragons = ['X', 'Y', 'Z'];
const numbers = [...Array(10).keys()].slice(1);

const createDeck = () => {
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
  constructor(suit, value=0, free=true) {
    this.suit = suit;
    this.value = value;
    this.onBoard = true;
    this.free = free;
  }
}

// card1 is valid child of card2: this means card1 and card2 are both numeric cards with different suits
// and card1's value is exactly 1 less than card2's value
const isValidChild = (card1, card2) =>
  card1.suit !== card2.suit && card1.value !== 0 && card1.value === card2.value-1;


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
  
class Column extends React.Component {
  canMove(index) {
    return index === (this.props.cards.length - 1) || 
      (isValidChild(this.props.cards[index+1], this.props.cards[index]) && this.canMove(index + 1));
  }
  
  render() {
    const cards = this.props.cards;
    return (
      <ul>
        {
          (cards.length && 
            cards.map((card, i) => 
            <li><Cardcomp card={card} canMove={this.canMove(i)} onClick={this.props.onCardClick(i)} /></li>))
          || <li><Cardcomp card={null} onClick={this.props.onCardClick(0)} /></li>
        }
      </ul>
    )
  }
}

const Hand = props => 
  props.cards.map(card => <Cardcomp card={card} canMove={false} />)

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: deal(),
      freeCells: [null, null, null],
      flower: null,
      home: suits.map(suit => new Card(suit, 0)),
      inMotion: null,
    }

    this.handleColumnClick = this.handleColumnClick.bind(this);
    this.handleFreeCellClick = this.handleFreeCellClick.bind(this);
    this.handleHomeCellClick = this.handleHomeCellClick.bind(this);
    this.handleFlowerClick = this.handleFlowerClick.bind(this);
  }

  handleColumnClick = columnIndex => cardIndex => () =>{
    const {columns, inMotion} = this.state;
    const pickedColumn = columns[columnIndex];
    const card1 = (inMotion && inMotion[0]) || null;
    const card2 = pickedColumn[cardIndex];

    const isValidMove = () =>
      (pickedColumn.length - 1 === cardIndex && isValidChild(card1, card2)) ||
      pickedColumn.length === 0;

    const newColumn = inMotion
    ? isValidMove()
      ? pickedColumn.concat(inMotion)
      : pickedColumn
    : pickedColumn.filter((_, i) => i < cardIndex) || [undefined];

    const newInMotion = inMotion
    ? isValidMove()
      ? null
      : inMotion
    : pickedColumn.slice(cardIndex, pickedColumn.length);

    const newColumns = columns.map((column, i) =>
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

    this.setState({
      freeCells: newFreeCells,
      inMotion: newInMotion,
    })
  }

  handleHomeCellClick = cellIndex => () => {
    const {home, inMotion} = this.state;

    if (!inMotion || inMotion.length !== 1) {
      return;
    }

    const cell = home[cellIndex];
    const card = inMotion[0];

    const isValidMove = card.suit === cell.suit && card.value === (cell.value + 1);

    const newCellState = (isValidMove && card) || cell;
    const newInMotion = (!isValidMove && inMotion) || null;

    const newHomeState = home.map((cell, i) => i === cellIndex ? newCellState : cell);

    this.setState({
      home: newHomeState,
      inMotion: newInMotion,
    })
  }

  handleFlowerClick = () => {
    const {inMotion} = this.state;
    if (!inMotion || inMotion[0].suit !== '@') {
      return;
    };

    const newflower = inMotion[0];
    const newInMotion = null;

    this.setState({
      flower: newflower,
      inMotion: newInMotion,
    });
  }

  allDragonsFree = dragon => {
    const {freeCells, columns} = this.state;
    const freeCards = freeCells.concat(columns.map(column => column.slice(-1)[0]));
    const freeDragons = freeCards.filter(card => card && card.suit === dragon);
    return freeDragons.length === 4 && freeCells.some(cell => cell === null || cell.suit === dragon);
  }

  handleDragonsClick = dragon => () => {
    const {freeCells, columns} = this.state;

    // remove all dragon cards from table
    const freeCellsNoDragon = freeCells.map(cell => cell && cell.suit === dragon ? null : cell);
    console.log(columns);
    const newColumns = columns.map(column =>
      column.length && column[column.length-1].suit === dragon
      ? column.slice(0, -1)
      : column
    );

    // fill first free freeCell with dragons and make unmoveable
    const freeIndex = freeCellsNoDragon.indexOf(null);
    const newFreeCells = freeCellsNoDragon.map((cell, i) => i === freeIndex ? new Card(dragon, 0, false) : cell);

    this.setState({
      freeCells: newFreeCells,
      columns: newColumns,
    });
  }

  isWinningState = () => {
    const {columns} = this.state;
    return columns.every(col => col.length===0);
  }

  render() {
    const {columns, freeCells, flower, home, inMotion} = this.state;
    const isWin = this.isWinningState();
    return (
      <div>
        {isWin && <h1>You win!</h1>}
        <table>
          <tr>
            {freeCells.map((cell, i) => <td><Cardcomp card={cell} canMove={cell===null || cell.free} onClick={this.handleFreeCellClick(i)} /></td>)}
          </tr>
          <tr>
            {dragons.map(dragon =>
              <td>
                <button disabled={!this.allDragonsFree(dragon)} onClick={this.handleDragonsClick(dragon)}>
                  Gather {dragon}s
                </button>
              </td>
            )}
          </tr>
        </table>
        <table>
          <tr>
            <td>@: <Cardcomp card={flower} canMove={true} onClick={this.handleFlowerClick} /></td>
          </tr>
        </table>
        <table>
          <tr>
            {home.map((cell, i) => (cell && <td><Cardcomp card={cell} canMove={true} onClick={this.handleHomeCellClick(i)} /></td>))}
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
