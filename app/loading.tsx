export default function Loading() {
  return <main id="main-content" className="shell loading-page" aria-busy="true" aria-label="正在加载人物全览"><div className="loading-brand">THE LINEUP<span /></div><div className="loading-grid">{Array.from({ length: 6 }, (_, index) => <div key={index} className="skeleton skeleton-photo" />)}</div></main>;
}
