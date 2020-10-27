const addLatencyAndPackagesLoss = (fnc, loss = true) => {
    if (loss && Math.random() > 0.5) return; // 10% package loss
    setTimeout(() => fnc(), 100 + Math.random() * 150); // random latency between 100 and 300
}
exports.addLatencyAndPackagesLoss = addLatencyAndPackagesLoss;