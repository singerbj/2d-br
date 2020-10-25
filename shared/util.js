const addLatencyAndPackagesLoss = (fnc, loss = true) => {
    // if (loss && Math.random() > 0.9) return; // 10% package loss
    setTimeout(() => fnc(), 0 + Math.random() * 0); // random latency between 100 and 300
    fnc();
}
exports.addLatencyAndPackagesLoss = addLatencyAndPackagesLoss;