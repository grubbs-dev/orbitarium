export function layoutReport(report, width = 1100, height = 680) {
  const nodes = report.repos.map((repo, index) => {
    const angle = (index / Math.max(1, report.repos.length)) * Math.PI * 2;
    const radius = Math.min(width, height) * 0.25 + (index % 3) * 55;
    const mass = 12 + Math.min(34, Math.sqrt(repo.fileCount + 1) * 4);
    return { ...repo, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius, radius: mass };
  });
  return { width, height, nodes, links: report.links };
}
