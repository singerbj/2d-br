const addLatencyAndPackagesLoss = (fnc, loss = true) => {
    if (loss && Math.random() > 0.5) return; // 10% package loss
    setTimeout(() => fnc(), 0 + Math.random() * 500); // random latency between 100 and 300
}
exports.addLatencyAndPackagesLoss = addLatencyAndPackagesLoss;