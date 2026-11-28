/** Links open in a new tab, because leaving the page would lose the current run. */
export function Footer() {
  return (
    <footer className="footer">
      <span>
        Neume font and shortcuts from{' '}
        <a href="https://github.com/neanes/neanes" target="_blank" rel="noreferrer">
          Neanes
        </a>
      </span>
      <a href={`${import.meta.env.BASE_URL}fonts/OFL.txt`} target="_blank" rel="noreferrer">
        Font licence (OFL 1.1)
      </a>
      <a href={`${import.meta.env.BASE_URL}fonts/OFL-LexendDeca.txt`} target="_blank" rel="noreferrer">
        Lexend Deca licence (OFL 1.1)
      </a>
      <span>
        Inspired by{' '}
        <a href="https://monkeytype.com" target="_blank" rel="noreferrer">
          Monkeytype
        </a>
      </span>
      <a href="https://github.com/Edesem/neume-type/issues" target="_blank" rel="noreferrer">
        Send feedback
      </a>
    </footer>
  );
}
