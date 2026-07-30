const tickerWords = [
  "Oshodi",
  "Balogun",
  "Mile 12",
  "Ariaria",
  "Onitsha Main",
  "Kurmi",
  "Wuse",
  "Bodija",
  "Alaba",
  "Trade Fair",
];

const tickerTrack = [...tickerWords, ...tickerWords];

export default function Ticker() {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker__track">
        {tickerTrack.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span>{word}</span>
            <span className="ticker__sep">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
