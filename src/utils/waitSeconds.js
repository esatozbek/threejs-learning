function* waitSeconds(duration) {
    while (duration > 0) {
        duration -= globals.deltaTime;
        yield;
    }
}

export default waitSeconds;