import React from 'react';
import { isEqual } from 'lodash';
import './App.css';

// game default quantities
const nSuits = 3;
const nDragons = 3;
const nNumbers = 10;
const nColumns = 8;
const perDragon = 4; // number of cards for each dragon

const suitLetters = [...Array(15).keys()].map(x => (x+10).toString(36).toUpperCase());
const dragonLetters = [...Array(15).keys()].map(x => (35-x).toString(36).toUpperCase());

const getSuits = n => suitLetters.slice(0, n);
const getDragons = n => dragonLetters.slice(0, n);
const getNumbers = n => [...Array(n).keys()].slice(1);

const createDeck = (dragons, cardsPerDragon, suits, numbers) => {
  // a deck is made up of 4 of each dragon, 1-9 for each suit and a flower card
  const cards = [
    dragons.map(x => Array(cardsPerDragon).fill(0).map(_ => new Card(x))),
    suits.map(x => numbers.map(y => new Card(x, y))),
    new Card('@'), // flower card
  ].flat(2);
  return cards;
}

const shuffleDeck = cards => {
  // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
  return cards.reduce((a, v) => a.splice(Math.floor(Math.random() * a.length), 0, v) && a, []);
}

const deal = (cards, numberOfColumns) => {
  // send cards to number of columns
  const cols = [...Array(numberOfColumns).keys()];
  const board = cols.map(x => cards.filter((_, i) => (i + x) % numberOfColumns === 0));
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

class Config extends React.Component {
  constructor() {
    super();

    this.state = {
      columns: nColumns,
      suits: nSuits,
      dragons: nDragons,
      numbers: nNumbers,
      cardsPerDragon: perDragon,
    }

    this.handleReset = this.handleReset.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(event) {
    const {dragons, suits, numbers, columns, cardsPerDragon} = this.state;
    this.props.handleSubmit(suits, dragons, numbers, columns, cardsPerDragon)();
    event.preventDefault();
  }

  handleChange(event) {
    this.setState({
      [event.target.name]: event.target.value
    });
  }

  handleReset() {
    this.setState({
        columns: nColumns,
        suits: nSuits,
        dragons: nDragons,
        numbers: nNumbers,
    });
  }

  render() {
    return (
      <form onSubmit={this.handleSubmit} >
        <table>
          <tbody style={{ "text-align": "right" }}>
            <tr>
              <td>
                <label>Suits: </label>
                <input type="number" name="suits" min="0" value={this.state.suits} onChange={this.handleChange} />
              </td>
              <td>
                <label>Dragons: </label>
                <input type="number" name="dragons" min="0" value={this.state.dragons} onChange={this.handleChange} />
              </td>
              <td>
                <label>Columns: </label>
                <input type="number" name="columns" min="0" value={this.state.columns} onChange={this.handleChange}/>
              </td>
            </tr>
            <tr>
              <td>
                <label>Cards/suit: </label>
                <input type="number" name="numbers" min="0" value={this.state.numbers} onChange={this.handleChange} />
              </td>
              <td>
                <label>Cards/dragon: </label>
                <input type="number" name="cardsPerDragon" min="0" value={this.state.cardsPerDragon} onChange={this.handleChange} />
              </td>
              <td>
                <input type="submit" value="Save & restart" />
                <button onClick={this.handleReset}>Defaults</button>
              </td>
            </tr>
          </tbody>
        </table>
      </form>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);

    const {state, dragons, suits, cardsPerDragon} = this.getStartingState();

    this.state = {
      history: [state],
      dragons,
      suits,
      cardsPerDragon,
    }
    this.newGame = this.newGame.bind(this);
  }

  getStartingState = (numberOfSuits=nSuits,
                   numberOfDragons=nDragons,
                   numberOfNumbers=nNumbers,
                   numberOfColumns=nColumns,
                   cardsPerDragon=perDragon) => {

    const suits = getSuits(numberOfSuits);
    const dragons = getDragons(numberOfDragons);
    const numbers = getNumbers(numberOfNumbers);

    const deck = createDeck(dragons, cardsPerDragon, suits, numbers);
    const columns = deal(shuffleDeck(deck), numberOfColumns);
    const freeCells = Array(numberOfDragons).fill(null);
    const home = suits.map(suit => new Card(suit, 0));

    const state = {
      columns,
      freeCells,
      home,
      flower: null,
      inMotion: null,
    }

    return {state, dragons, suits, cardsPerDragon};
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
    const {cardsPerDragon} = this.state;
    const freeCards = freeCells.concat(columns.map(column => column.slice(-1)[0]));
    const freeDragons = freeCards.filter(card => card && card.suit === dragon);
    return !inMotion && 
      freeDragons.length === cardsPerDragon && 
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

  newGame = (numberOfSuits=nSuits,
            numberOfDragons=nDragons,
            numberOfNumbers=nNumbers,
            numberOfColumns=nColumns,
            numberPerDragon=perDragon) => () => {
    
    const {state, dragons, suits, cardsPerDragon} = this.getStartingState(
      Number(numberOfSuits),
      Number(numberOfDragons),
      Number(numberOfNumbers),
      Number(numberOfColumns),
      Number(numberPerDragon),
    );

    this.setState({
      history: [state],
      dragons,
      suits,
      cardsPerDragon,
    });
  }

  resetGame = () => {
    const {history} = this.state;
    const state = history[0];
    this.updateState(state);
  }

  toggleConfig = () => {
    const {config} = this.state;
    this.setState({
      config: !config,
    })
  }

  render() {
    const {columns, freeCells, flower, home, inMotion} = this.getLastState();
    const {dragons} = this.state;
    const isWin = this.isWinningState();
    return (
      <div>
        {this.state.config && <Config handleSubmit={this.newGame}/>}
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
              <button onClick={this.newGame()}>new game</button><br/>
              <button onClick={this.goBackMoves(1)}>"undo"</button>
              <button onClick={this.rollBackMoves(1)}>undo</button><br/>
              <button onClick={this.autoComplete}>auto move</button>
              <button onClick={this.toggleConfig}>settings</button>
            </td>
          </tr>
          <tr>
            <td colSpan={3}>
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
