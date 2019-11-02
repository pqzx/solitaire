import React from 'react';
import { isEqual } from 'lodash';
import './App.css';

const suits = ['A', 'B', 'C'];
const dragons = ['X', 'Y', 'Z'];
const numbers = [...Array(10).keys()].slice(1);

const createDeck = () => {
  // a deck is made up of 4 of each dragon, 1-9 for each suit and a flower card
  const cards = [
    dragons.map(x => Array(4).fill(0).map(_ => new Card(x))),
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

let key = 0;
const getKey = () => ++key;

class Card {
  constructor(suit, value=0, free=true) {
    this.suit = suit;
    this.value = value;
    this.free = free;
    this.id = getKey();
  }
}

// card1 is valid child of card2: this means card1 and card2 are both numeric cards with different suits
// and card1's value is exactly 1 less than card2's value
const isValidChild = (card1, card2) =>
  card1.suit !== card2.suit && card1.value !== 0 && card1.value === card2.value-1;

const Cardcomp = props => {
  if (props.card) {
    return (
      <button disabled={!props.canMove} onClick={props.onClick}>
        {props.card.suit}{props.card.value || ''}
      </button>
    )
  }
  return (
    <button onClick={props.onClick}>
      Empty
    </button>
  )
}

const Hand = props => 
  <ul>
    {props.cards.map(card => <li key={card.id}><Cardcomp card={card} canMove={false} /></li>)}
  </ul>  

const Table = ({children}) =>
  <table>
    <tbody>
      {children}
    </tbody>
  </table>

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
            <li key={card.id}><Cardcomp card={card} canMove={this.canMove(i)} onClick={this.props.onCardClick(i)} /></li>))
          || <li key={'0'}><Cardcomp card={null} onClick={this.props.onCardClick(0)} /></li>
        }
      </ul>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    const state = {
      columns: deal(),
      freeCells: [null, null, null],
      flower: null,
      home: suits.map(suit => new Card(suit, 0)),
      inMotion: null,
    }

    this.state = {
      history: [state],
    }

  }

  getLastState = () => this.state.history.slice(-1)[0];

  updateState = (state) => {
    const {history} = this.state;
    const lastState = history.slice(-1)[0];
    if (isEqual(state, lastState)) {
      return;
    }
    this.setState({
      history: [...history, state]
    });
  }

  rollBackMoves = n => () => {
    // hard rewind to a previous state, subsequent states are lost
    const history = this.state.history.slice(0,-n);
    if (history.length < 1) {
      return;
    }
    this.setState({
      history: history,
    });
  }

  goBackMoves = n => () => {
    // previous state is accessed by adding to end of history
    const state = this.state.history.slice(-n-1)[0];
    this.updateState(state);
  }

  handleColumnClick = columnIndex => cardIndex => () =>{
    const {columns, inMotion, ...state} = this.getLastState();
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

    this.updateState({
      inMotion: newInMotion,
      columns: newColumns,
      ...state,
    })
  }

  handleFreeCellClick = cellIndex => () => {
    // if cell is empty and inMotion card length = 1, move inmotion into cell
    // if cell is occupied and no inmotion cards, move card into inMotion * caveat doesn't work if cell contains set of dragons
    // if cell is occupied and inMotion cards in play, do nothing
    const {freeCells, inMotion, ...state} = this.getLastState()
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

    this.updateState({
      freeCells: newFreeCells,
      inMotion: newInMotion,
      ...state,
    })
  }

  handleHomeCellClick = cellIndex => () => {
    const {home, inMotion, ...state} = this.getLastState()

    if (!inMotion || inMotion.length !== 1) {
      return;
    }

    const cell = home[cellIndex];
    const card = inMotion[0];

    const isValidMove = card && card.suit === cell.suit && card.value === (cell.value + 1);

    const newCellState = (isValidMove && card) || cell;
    const newInMotion = (!isValidMove && inMotion) || null;

    const newHomeState = home.map((cell, i) => i === cellIndex ? newCellState : cell);

    this.updateState({
      home: newHomeState,
      inMotion: newInMotion,
      ...state,
    })
  }

  handleFlowerClick = () => {
    const {inMotion, flower, ...state} = this.getLastState()
    if (!inMotion || inMotion[0].suit !== '@') {
      return;
    };

    const newflower = inMotion[0];
    const newInMotion = null;

    this.updateState({
      flower: newflower,
      inMotion: newInMotion,
      ...state,
    });
  }

  allDragonsFree = dragon => {
    const {freeCells, columns, inMotion} = this.getLastState();
    const freeCards = freeCells.concat(columns.map(column => column.slice(-1)[0]));
    const freeDragons = freeCards.filter(card => card && card.suit === dragon);
    return !inMotion && 
      freeDragons.length === 4 && 
      freeCells.some(cell => cell === null || cell.suit === dragon);
  }

  handleDragonsClick = dragon => () => {
    const {freeCells, columns, ...state} = this.getLastState();

    // remove all dragon cards from table
    const freeCellsNoDragon = freeCells.map(cell => cell && cell.suit === dragon ? null : cell);
    const newColumns = columns.map(column =>
      column.length && column[column.length-1].suit === dragon
      ? column.slice(0, -1)
      : column
    );

    // fill first free freeCell with dragons and make unmoveable
    const freeIndex = freeCellsNoDragon.indexOf(null);
    const newFreeCells = freeCellsNoDragon.map((cell, i) => i === freeIndex ? new Card(`${dragon}*`, 0, false) : cell);

    this.updateState({
      freeCells: newFreeCells,
      columns: newColumns,
      ...state,
    });
  }

  isWinningState = () => {
    const {columns, inMotion} = this.getLastState()
    return !inMotion && columns.every(col => col.length===0);
  }

  autoComplete = () => {
    // when free cards on the table are the next card for home spots, move them there
    const {inMotion, columns, freeCells, home} = this.getLastState();
    if (inMotion) {
      return; // can't autocomplete when holding a card
    }

    columns.forEach((column, index) => {
      if (!column.length) {
        return;
      }
      const lastCard = column.slice(-1)[0];
      switch (lastCard.suit) {
        case '@': // TODO: fix hardcoding
          [
            this.handleColumnClick(index)(column.length-1),
            this.handleFlowerClick,
          ].reduce((p, f) => p.then(f), Promise.resolve());
          break;
        case 'A':
        case 'B':
        case 'C':
          // find home column that matches suit
          let homeIndex = home
            .map((cell, index) => cell.suit === lastCard.suit ? index : null)
            .filter(x => x !== null)[0];
          if (! (home[homeIndex].value + 1 === lastCard.value)) {
            return;
          }
          [
            this.handleColumnClick(index)(column.length-1),
            this.handleHomeCellClick(homeIndex)
          ].reduce((p, f) => p.then(f), Promise.resolve());
          break;
        default:
          break;
      }
    })

    freeCells.forEach((freeCell, index) => {
      if (!freeCell) {
        return;
      }
      switch (freeCell.suit) {
        case '@': // TODO: fix hardcoding
          [
            this.handleFreeCellClick(index),
            this.handleFlowerClick,
          ].reduce((p, f) => p.then(f), Promise.resolve());
          break;
        case 'A':
        case 'B':
        case 'C':
          // find home column that matches suit
          let homeIndex = home
            .map((cell, index) => cell.suit === freeCell.suit ? index : null)
            .filter(x => x !== null)[0];
          if (! (home[homeIndex].value + 1 === freeCell.value)) {
            return;
          }
          [
            this.handleFreeCellClick(index),
            this.handleHomeCellClick(homeIndex)
          ].reduce((p, f) => p.then(f), Promise.resolve());
          break;
        default:
          break;
      }
    })
  }

  newGame = () => {
    const state = {
      columns: deal(),
      freeCells: [null, null, null],
      flower: null,
      home: suits.map(suit => new Card(suit, 0)),
      inMotion: null,
    };

    this.setState({
      history: [state],
    });
  }

  resetGame = () => {
    const {history} = this.state;
    const state = history[0];
    this.updateState(state);
  }

  render() {
    const {columns, freeCells, flower, home, inMotion} = this.getLastState();
    const isWin = this.isWinningState();
    return (
      <div>
        <Table>
          <tr>
            <td>
              <Table>
                <tr>
                  {freeCells.map((cell, i) => <td><Cardcomp card={cell} canMove={cell===null || cell.free} onClick={this.handleFreeCellClick(i)} /></td>)}
                </tr>
                <tr>
                  {dragons.map(dragon =>
                    <td>
                      <button disabled={!this.allDragonsFree(dragon)} onClick={this.handleDragonsClick(dragon)}>
                        ^ {dragon}s
                      </button>
                    </td>
                  )}
                </tr>
              </Table>  
            </td>
            <td>
              <Table>
                <tr>
                  <td><Cardcomp card={flower} canMove={true} onClick={this.handleFlowerClick} /></td>
                </tr>
                <tr>
                  <td>^ @</td>
                </tr>
              </Table>
            </td>
            <td>
              <Table>
                <tr>
                  {home.map((cell, i) => (cell && <td><Cardcomp card={cell} canMove={true} onClick={this.handleHomeCellClick(i)} /></td>))}
                </tr>
              </Table>
            </td>
            <td>
              <button onClick={this.resetGame}>reset game</button>
              <button onClick={this.newGame}>new game</button><br/>
              <button onClick={this.goBackMoves(1)}>"undo"</button>
              <button onClick={this.rollBackMoves(1)}>undo</button><br/>
              <button onClick={this.autoComplete}>auto move</button>
            </td>
          </tr>
          <tr>
            <td colspan={3}>
              <Table>
                <tr>
                  {columns.map((column, i) => <td><Column cards={column} onCardClick={this.handleColumnClick(i)} /></td>)}
                </tr>
              </Table>
            </td>
          </tr>
        </Table>
        <div style={{ height: "2em" }}></div>
        {inMotion && <Hand cards={inMotion} />}
        {isWin && <h1>You win!</h1>}
      </div>
    )
  }
}

export default App;
