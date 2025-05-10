import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css';

function ChessGame() {
  const boardRef = useRef(null);
  const gameRef = useRef(null);
  const statusRef = useRef(null);
  const [gameMode, setGameMode] = useState(null); // 'computadora' o 'humano'
  const [boardKey, setBoardKey] = useState(0); // Usado para forzar el re-montaje
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);

  // Función auxiliar para actualizar el estado
  function updateStatus() {
    if (!statusRef.current || !gameRef.current) return;
    let status = '';
    let moveColor = gameRef.current.turn() === 'b' ? 'Negras' : 'Blancas';

    if (gameRef.current.isCheckmate()) {
      status = `Fin del juego, ${moveColor} están en jaque mate.`;
    } else if (gameRef.current.isDraw()) {
      status = 'Fin del juego, posición de tablas';
    } else {
      status = `Turno de ${moveColor}`;
      if (gameRef.current.isCheck()) {
        status += `, ${moveColor} están en jaque`;
      }
    }

    statusRef.current.innerHTML = status;
  }

  // Función auxiliar para resaltar casillas
  function highlightSquares(squares) {
    const $ = window.jQuery;
    removeHighlights();
    squares.forEach(square => {
      $(`#board .square-${square}`).addClass('highlight-square');
    });
  }

  // Función auxiliar para quitar resaltado de casillas
  function removeHighlights() {
    const $ = window.jQuery;
    $('#board .square-55d63').removeClass('highlight-square');
    $('#board .highlight-square').removeClass('highlight-square');
  }

  // Controla el inicio del arrastre de piezas
  const onDragStart = (source, piece) => {
    if (gameRef.current.isGameOver()) return false;
    if (gameMode === 'computer' && piece.search(/^b/) !== -1) return false;
    if (gameMode === 'human') {
      const turn = gameRef.current.turn();
      if ((turn === 'w' && piece.search(/^b/) !== -1) ||
          (turn === 'b' && piece.search(/^w/) !== -1)) {
        return false;
      }
    }
  };

  // Realiza un movimiento aleatorio para la computadora
  function makeRandomMove() {
    const possibleMoves = gameRef.current.moves();
    if (possibleMoves.length === 0) return;

    const randomIdx = Math.floor(Math.random() * possibleMoves.length);
    gameRef.current.move(possibleMoves[randomIdx]);
    boardRef.current.position(gameRef.current.fen());
    updateStatus();
  }

  // Función auxiliar para actualizar las piezas capturadas
  function updateCapturedPieces() {
    const history = gameRef.current.history({ verbose: true });
    const white = [];
    const black = [];
    history.forEach(move => {
      if (move.captured) {
        if (move.color === 'w') {
          black.push(move.captured);
        } else {
          white.push(move.captured);
        }
      }
    });
    setCapturedWhite(white);
    setCapturedBlack(black);
  }

  // Controla el evento de soltar una pieza
  function onDrop(source, target) {
    try {
      const move = gameRef.current.move({
        from: source,
        to: target,
        promotion: 'q'
      });
      if (move === null) return 'snapback';
      updateStatus();
      updateCapturedPieces();

      if (gameMode === 'computer') {
        setTimeout(() => {
          makeRandomMove();
          updateCapturedPieces();
        }, 250);
      }
    } catch (error) {
      return 'snapback';
    }
  }

  // Actualiza la posición después de soltar una pieza
  function onSnapEnd() {
    boardRef.current.position(gameRef.current.fen());
  }

  useEffect(() => {
    if (!gameMode) return;

    const ChessboardInstance = window.Chessboard;
    gameRef.current = new Chess();

    // Resalta movimientos posibles al pasar el mouse sobre una casilla
    function onMouseoverSquare(square) {
      const moves = gameRef.current.moves({
        square,
        verbose: true
      });
      if (moves.length === 0) return;
      const squaresToHighlight = moves.map(move => move.to);
      highlightSquares(squaresToHighlight);
    }

    // Quita el resaltado al salir el mouse de una casilla
    function onMouseoutSquare(square) {
      removeHighlights();
    }

    const config = {
      draggable: true,
      position: 'start',
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd,
      pieceTheme: function(piece) {
        return `/img/chesspieces/wikipedia/${piece}.png`;
      }, // <-- ESTA COMA ES NECESARIA
      // Aquí puedes quitar los handlers de mouseover/mouseout si no los usas
    };

    // Solo inicializa el tablero si el div existe
    if (document.getElementById('board')) {
      boardRef.current = ChessboardInstance('board', config);
      updateStatus();
      updateCapturedPieces();

      // Agrega el evento de click para seleccionar casillas
      const $ = window.jQuery;
      $('#board').off('click.square').on('click.square', '.square-55d63', function () {
        const square = $(this).attr('data-square');
        if (!square) {
          setSelectedSquare(null);
          removeHighlights();
          return;
        }

        // Obtiene los movimientos posibles para la casilla seleccionada
        const moves = gameRef.current.moves({ square, verbose: true });
        if (moves.length === 0) {
          setSelectedSquare(null);
          removeHighlights();
          return;
        }

        setSelectedSquare(square);
        const squaresToHighlight = moves.map(move => move.to);
        highlightSquares(squaresToHighlight);
      });
    }

    // Limpia los eventos y resaltados al desmontar o cambiar modo
    return () => {
      if (boardRef.current && boardRef.current.destroy) {
        boardRef.current.destroy();
      }
      boardRef.current = null;
      removeHighlights();
      const $ = window.jQuery;
      $('#board').off('click.square');
    };
    // eslint-disable-next-line
  }, [gameMode, boardKey, selectedSquare]);

  // Handler para reiniciar el tablero (cambia la clave para forzar el remount)
  const handleReset = () => {
    setBoardKey(k => k + 1);
    setSelectedSquare(null);
  };

  // Renderiza las piezas capturadas
  function renderCaptured(pieces, color) {
    // Mapea la letra de la pieza al archivo de imagen
    return pieces.map((p, idx) => {
      const pieceCode = (color === 'w' ? 'w' : 'b') + p.toUpperCase();
      return (
        <img
          key={idx}
          src={`/img/chesspieces/wikipedia/${pieceCode}.png`}
          alt={pieceCode}
          style={{ width: 32, height: 32, margin: 2 }}
        />
      );
    });
  }

  return (
    <div className="chess-game" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      {gameMode && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 10 }}>
          {/* Piezas negras capturadas (por blancas) */}
          {renderCaptured(capturedBlack, 'b')}
        </div>
      )}
      <div>
        {!gameMode ? (
          <div className="mode-selection">
            <h2>Selecciona el modo de juego</h2>
            <button onClick={() => setGameMode('human')} className="mode-btn">
              Humano vs Humano
            </button>
            <button onClick={() => setGameMode('computer')} className="mode-btn">
              Humano vs PC
            </button>
          </div>
        ) : (
          <>
            <div id="board" key={boardKey} style={{ width: '400px', margin: '0 auto' }}></div>
            <div className="game-info">
              <div ref={statusRef} className="status"></div>
              <button
                onClick={() => {
                  setGameMode(null);
                  handleReset();
                  setCapturedWhite([]);
                  setCapturedBlack([]);
                }}
                className="reset-btn"
              >
                Juego Nuevo
              </button>
            </div>
          </>
        )}
      </div>
      {gameMode && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 10 }}>
          {/* Piezas blancas capturadas (por negras) */}
          {renderCaptured(capturedWhite, 'w')}
        </div>
      )}
    </div>
  );
}

export default ChessGame;
