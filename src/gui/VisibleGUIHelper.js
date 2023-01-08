class VisibleGUIHelper {
  constructor(...objects) {
    this.objects = [...objects];
  }
  get value() {
    return this.objects[0].visible;
  }
  set value(v) {
    this.objects.forEach((obj) => {
      obj.visible = v;
    });
  }
}

export default VisibleGUIHelper;
