
//=============================== TIME ========================
class Time{
  constructor() {
    this.frame = 0;
    this.absTime = performance.now();
    this.mseconds = 0;
    this.seconds = 0;
    this.deltas = 0;
    this.rate = 60;

  }


   update(){
    this.frame++;
    this.mseconds += performance.now()-this.absTime;
    this.deltas = (performance.now()-this.absTime)*0.001;
    this.seconds = this.mseconds*0.001;
    this.absTime = performance.now()
   }

}

class Connector {
    constructor(owner, index, isInput, description) {
        this.owner = owner;
        this.index = index;
        this.isInput = isInput;
        this.connections = [];
        this.description = description;
        this.inOP = null;
        this.outOP = null;
        this.multiInput = false;
    }

    // Public methods
    connect(target) {
      if (!target) {console.warn('Target cannot be null or undefined'); return;}
      
      let input;
      let output;

      if (this.isInput){
        if(target.isInput === true) {console.warn('Cannot connect input to input'); return;}
        input = this;
        output = target;
      }
      else{
        if(target.isInput === false) {console.warn('Cannot connect output to output'); return;}
        input = target;
        output = this;
      }

      if (!output.owner) { //OUTPUT IS OP
        if (output.outputConnectors.length>0) output = output.outputConnectors[0];
        else {console.warn('OPs has no outputs'); return;}
      }

      if (!input.owner) { //INPUT IS OP
        if (input.inputConnectors.length>0) {
          if (!input.isMultiInputs) input = input.inputConnectors[input.inputConnectors.length-1];//UNORDERED INPUT OP
          else input = input.inputConnectors[0];
        }
        else {console.warn('OPs has no outputs'); return;}
      }

      if(input.inOP) input = input.inOP.inputConnectors[0]; //inOP OF COMP 
      if(output.outOP) output = output.outOP.outputConnectors[0]; //outOP OF COMP
      
      if (input.family != output.family){console.warn('OPs must be same family'); return;}
      if (input.owner == output.owner){console.warn('Can not connect to the same OP'); return;}
      
      input.connections = [output];

      if(!input.owner.isMultiInputs){ //UNORDERED 
        if(input.index == input.owner.inputConnectors.length-1){ //CONNECT TO LAST input
          this.owner.inputConnectors.push(new Connector(this.owner,this.index+1,true,`Source${this.index+1}`))
        }
      }
      input.owner.updateOrderedInputs();
      output.connections.push(input);

    }

    disconnect() {
        
    }
}


class ConnectorUI{
  constructor(connector){
    this.connector = connector;
    this.owner = this.connector.owner;
    this.ui = document.createElement('div');
    this.isInput = this.connector.isInput;
    this.index = this.connector.index;
    this.isUnordered = false;


    let directionCssName = 'output';
    if(this.isInput)directionCssName = 'input';
    
    this.ui.classList.add('connector', directionCssName , this.owner.family);
    this.owner.opUI.op.appendChild(this.ui);
    
    let numConnectors = this.owner.inputConnectors.length;
    if (!this.isInput) numConnectors = this.owner.outputConnectors.length;
    const index = this.connector.index;
    this.ui.style.top = `${(index/numConnectors+0.5/numConnectors)*50+25}%`;
    
    this.ui.addEventListener('mousedown', (event) => {viewport.onMouseDownOpConnector(event, this);});
    this.ui.addEventListener('mouseup',   (event) => {viewport.onMouseUpOpConnector(event, this);});
    this.ui.addEventListener('mouseover', (event) => {viewport.onMouseOverOpConnector(event, this);});
    this.ui.addEventListener('mouseout',  (event) => {viewport.onMouseOutOpConnector(event, this);});
    
  }
}

class UnorderedConnectorUI{
  constructor(owner){
    this.owner = owner;
    this.ui = document.createElement('div');
    this.isInput = true;
    this.index = 0;
    this.isUnordered = true;
    this.ui.classList.add('connector', 'input' , this.owner.family);
    this.owner.opUI.op.appendChild(this.ui);
    
    let numConnectors = this.owner.inputConnectors.length;
    this.ui.style.top = `50%`;
    this.ui.style.height = `${numConnectors*4+8}px`;
    
    this.ui.addEventListener('mousedown', (event) => {viewport.onMouseDownOpConnector(event, this);});
    this.ui.addEventListener('mouseup',   (event) => {viewport.onMouseUpOpConnector(event, this);});
    this.ui.addEventListener('mouseover', (event) => {viewport.onMouseOverOpConnector(event, this);});
    this.ui.addEventListener('mouseout',  (event) => {viewport.onMouseOutOpConnector(event, this);});

  }
}






























//=============================== OP ========================
class OP{
  constructor(name, time, gl, isMultiInputs, defaultInputs, defaultOutputs) {
    this.gl = gl;
    this.error = null;
    this.name = name;
    this.time = time;
    this.cook = 0;
    this.prevCook = 0;
    this.initialized = false;
    this.dirty = true;
    this.current = false;
    this.selected = false;
    this.prevNodeX;
    this.prevNodeY;
    //UI
    this.lastUpdate
    this.nodeX = 0;
    this.nodeY = 0;
    this.opUI ={};
    this.opUIbars ={};

    this.par = {};
    this.family;
    this.inputs = [];
    this.orderedInputs = [];
    this.dependencies = [];

    this.bypass = false;

    this.defaultInputs = defaultInputs;
    this.defaultOutputs = defaultOutputs; 
    this.isMultiInputs = isMultiInputs;
    this.inputConnectors = [];
    this.outputConnectors = [];
    this.initConnectors();
  }

  //INITIAL OP STATE
  initConnectors(){
    this.inputs = [];
    
    if(!this.isMultiInputs)this.inputConnectors.push(new Connector(this,0,true,`Source0`));
    else
      {
        for(let i=0; i< this.defaultInputs.length; i++){
          this.inputConnectors.push(new Connector(this,i,true,this.defaultInputs[i]));
        }
      }

    this.outputs = [];
    for(let i =0 ; i< this.defaultOutputs.length; i ++){
      this.outputConnectors.push(new Connector(this,i,false,this.defaultOutputs[i]));//owner,index,?input,description
    }
  }

  initialize(){
    console.log('-->INITIALIZE: ', this.path);
    if(!this.initialized){
      console.log('INIT CONNECTED: ', this.path);
      this.initConnected();
      this.initFamily();
      console.log('DO INIT: ', this.path);
      this.doInit();
      this.initialized = true;
    }
  }

  updateOrderedInputs(){
    this.orderedInputs = [];
    this.inputs = [];
    for(let i =0; i<this.inputConnectors.length; i++){
      const connector = this.inputConnectors[i];
      if(connector.connections.length>0){
        this.orderedInputs.push(connector.connections[0].owner);
        this.inputs.push(connector.connections[0].owner);
      }
      else this.orderedInputs.push(null);
    }
  }

  initConnected(){
    for (let j = 0; j< this.dependencies.length; j++) {this.dependencies[j].initialize();}
    for (let j = 0; j< this.inputs.length; j++) {this.inputs[j].initialize();}
  }

  initFamily(){
    //BY FAMILY INITIALIZATION
  }

  doInit(){
    //EACH CLASS INITIALIZATION   
  }

  

  onConnectionChange(){
    //BY FAMILY
  }

  connect(a){//simplified serialized - use carefully
    this.inputConnectors[this.inputs.length].connections.push(a.outputConnectors[0]);
    this.inputs.push(a);
    a.outputs.push(this)
    if(!this.isMultiInputs){
      this.inputConnectors.push(new Connector(this,this.inputConnectors.length,true,`Source${this.inputConnectors.length}`));
    }
    this.updateOrderedInputs();
  }



  updateConnected(){
    for (let j = 0; j< this.dependencies.length; j++) {this.dependencies[j].update();}
    for (let j = 0; j< this.inputs.length; j++) {this.inputs[j].update();}
  }


  update(){
    if (this.lastUpdate != this.time.frame){
      this.updateConnected();
      this.cook = performance.now();
      this.updateDo();
      this.cook = (this.prevCook+performance.now()-this.cook)/2;
      this.prevCook = this.cook*1;

      this.lastUpdate = this.time.frame;
      this.initialized = false;
    }
  }

//UI STAFF ===============


  createUI(){
    this.opUI.op = document.createElement('div');
    this.opUI.op.classList.add('op');
    document.body.appendChild(this.opUI.op);
    this.opUI.op.addEventListener('click', (event) => onOpClick(event, this));
    this.opUI.op.addEventListener('mousedown', (event) => {viewport.onMouseDownOp(event, this);});
    
    //INPUT CONNECTORS:
    const numInputs = this.inputConnectors.length;
    if(this.isMultiInputs){
      for(var i in this.inputConnectors){
        new ConnectorUI(this.inputConnectors[i]);
      }
    }
    //UNORDERED INPUTS
    else{
      new UnorderedConnectorUI(this);
    }

    //OUTPUT
    const numOutputs = this.outputConnectors.length
    for(var i in this.outputConnectors){
      new ConnectorUI(this.outputConnectors[i]);
      
    }


    this.u0 = 0;
    this.u1 = 0;
    this.v0 = 0;
    this.v1 = 0;
    
    this.createUIbyClass();
  }

  updataNodeXY(viewport){
    
    
    this.x = (this.nodeX - viewport.x)*viewport.zoom+viewport.width/2;
    this.y = (this.nodeY - viewport.y)*viewport.zoom+viewport.height/2;
    this.opUI.op.style.left = Math.floor(this.x).toString()+'px';
    this.opUI.op.style.bottom = Math.floor(this.y).toString()+'px';
    this.opUI.op.style.transform = `scale(${viewport.zoom})`;
    this.opUI.op.style.borderWidth = (1/viewport.zoom) + "px";
    this.updateViewerCoord(viewport); 

    if(this.selected) this.opUI.op.style.boxShadow = `0 0 0 ${1/viewport.zoom}px yellow`;
    else if(this.current) this.opUI.op.style.boxShadow = "0 0 0 2px green";
    else this.opUI.op.style.boxShadow = 'none';


  }




  updateViewerCoord(viewport){
    let rect = this.opUI.op.getBoundingClientRect();
    this.u0 = rect.left/viewport.width;
    this.u1 = rect.right/viewport.width;
    this.v0 = 1-rect.bottom/viewport.height;
    this.v1 = 1-rect.top/viewport.height;
  }




  createUIbyClass(){
  //EACH FAMILY
  }


  hideUi(){
    this.opUI.op.style.visibility = "hidden";
  }

  showUi(){
    this.opUI.op.style.visibility = "visible";
  }


  //HELPERS:
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}




//=============================== TOP =====================
class TOP extends OP{
  constructor(...args) {
    super(...args);
    this.gl = gl;
    this.family = 'TOP';
    this.par.outputresolution = 0;  //Output Resolution:  0: Use Input  1: Eighth  2: Quarter  3: Half  4: 2X  5: 4X  6: 8X  7: Fit Resolution  8: Limit Resolution  9: Custom Resolution  10: Parent Panel Size
    this.par.resolutionw = 256;  //Resolution
    this.par.resolutionh = 256;  //Resolution
    this.fixedResInput = 0;

    
  }

  //WEBGL 2.0
  vertexShader =`#version 300 es
  in vec2 position;
  out vec3 vUV;
  void main() {
    gl_Position = vec4( position,0.0, 1.0 );
    vUV.xy = position * 0.5 + 0.5;
    vUV.z = 0.; 
  }`;
  
  fragmentShader = '';
  program;
  uniforms = [];
  output;
  resX;
  resY;
  buffer;
  toScreen = false;

  appendUniform(name, type, vals){
    var c = {'name':name, 'type':type, 'vals': vals};
    this.uniforms.push(c);
  }


  createTarget( width, height, type ) {

    var target = {};
    const gl = this.gl;

    target.framebuffer = gl.createFramebuffer();
    target.renderbuffer = gl.createRenderbuffer();
    target.texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, target.texture );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindFramebuffer( gl.FRAMEBUFFER, target.framebuffer );
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0 );
    gl.bindTexture( gl.TEXTURE_2D, null );
    gl.bindRenderbuffer( gl.RENDERBUFFER, null );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null);
    return target;

  }

  createShader( src, type ) {
    var shader = this.gl.createShader( type );
    this.gl.shaderSource( shader, src );
    this.gl.compileShader( shader );
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', this.path, this.gl.getShaderInfoLog(shader));
        const shaderSourceLines = src.split("\n");
        shaderSourceLines.forEach((line, index) => {
          console.log(`${index + 1}: ${line}`);
        });
        this.gl.deleteShader(shader);
        return null;
    }
    // console.log(this.name, src);
    return shader;
  }

  cacheUniformLocation(program, label) {
    if (program.uniformsCache === undefined) {
        program.uniformsCache = {};
    }
    program.uniformsCache[label] = this.gl.getUniformLocation(program, label);
  }

  setResolution(){
     // console.log('=====>> RESIZE',this.name)
    if (this.par.outputresolution == 0){ //USE INPUT
      if(this.inputs.length == 0){
        this.width = this.par.resolutionw;
        this.height = this.par.resolutionh;
      }
      else{
        const inOp = this.inputs[this.fixedResInput];
        // console.log('=========>> RES FROM INPUT',inOp.name)
        this.width = inOp.width;
        this.height = inOp.height;
      }
    }
    if (this.par.outputresolution == 9){
      this.width = this.par.resolutionw;
      this.height = this.par.resolutionh;
    }

    if (this.par.outputresolution == 10){
      this.width = this.gl.drawingBufferWidth;
      this.height = this.gl.drawingBufferHeight;
    }

    this.appendUniform('resolution','2f',[this.width,this.height]);
    // console.log('---->SET RESOLUTION:',this.name, this.width, this.height, this.fixedResInput);
    
    let N = this.inputs.length;
    if (N>0){
      for (let i=0; i<N; i++){
        this.appendUniform(`uTD2DInfos[${i}].res`,'4f', [1./this.inputs[i].width, 1./this.inputs[i].height, this.inputs[i].width, this.inputs[i].height]);
        this.appendUniform(`uTD2DInfos[${i}].depth`,'4f',[1.,1.,1.,1.]);
        // console.log(this.name,'TO UNIFORMS->', this.inputs[i].width,this.inputs[i].height);
      }
      // console.log(this.name, 'RES UNIFORM->', this.width,this.height);
    }



  }

  insertTDUniforms(){
    let example = '';
    let texInfoArray = [];
    let N = this.inputs.length;

    if (N>0){
      for (let i=0; i<N; i++){
        texInfoArray.push(`TDTexInfo(vec4(1./${Math.round(this.inputs[i].width)}., 1./${Math.round(this.inputs[i].height)}., ${Math.round(this.inputs[i].width)}., ${Math.round(this.inputs[i].height)}.), vec4(1.))`)
      }
      example = `
  struct TDTexInfo {
    vec4 res;
    vec4 depth;
  };

  uniform TDTexInfo uTD2DInfos[${N}];
  const int TD_NUM_2D_INPUTS = ${N};`;
  }
  
  this.fragmentShader = this.fragmentShader.replace('@TDUniforms@',example);
  }

  disposeResources() {
    const gl = this.gl;

    // Delete shader program and shaders
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.vs) {
      gl.deleteShader(this.vs);
      this.vs = null;
    }
    if (this.fs) {
      gl.deleteShader(this.fs);
      this.fs = null;
    }

    // Delete vertex buffer
    if (this.buffer) {
      gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }

    // Delete output target resources (framebuffer, renderbuffer, texture)
    if (this.output) {
      if (this.output.framebuffer) gl.deleteFramebuffer(this.output.framebuffer);
      if (this.output.renderbuffer) gl.deleteRenderbuffer(this.output.renderbuffer);
      if (this.output.texture) gl.deleteTexture(this.output.texture);
      this.output = null;
    }
    
    // If you have any additional resources, delete them here.
  }

  doInit(){
    // console.log('&&& DO INIT TOP');
    this.disposeResources();
    this.setResolution();
    this.insertTDUniforms();
    this.onCompile();
    this.compile();
    // console.log(this.name, ' shader:\n',this.fragmentShader);
  }
  onResize(){

  }

  resize(){
    for (let j = 0; j< this.inputs.length; j++) {
      this.inputs[j].resize();
    }

    this.setResolution();
    try {
      this.gl.useProgram(this.program);
      //RESOLUTION RELATED UNIFORMS ===============
      if(this.program.uniformsCache && this.program.uniformsCache['resolution']) {
        this.gl.uniform2f(this.program.uniformsCache['resolution'], this.width, this.height);
      }
      let N = this.inputs.length;
      if (N>0) {
        for (let i=0; i<N; i++) {
          this.gl.uniform4f(this.program.uniformsCache[`uTD2DInfos[${i}].res`],1./this.inputs[i].width, 1./this.inputs[i].height, this.inputs[i].width, this.inputs[i].height);
          this.gl.uniform4f(this.program.uniformsCache[`uTD2DInfos[${i}].depth`],1.,1.,1.,1.);
        }
      }
      this.gl.useProgram(null);
      this.output = this.createTarget(this.width, this.height, this.gl.UNSIGNED_BYTE);
    } catch (e) {
      console.error('catched: ',e);
    }

    this.onResize();
  }

  onCompile(){
  }

  compile(){
    const gl = this.gl;
   
    this.buffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [-1.0,-1.0, 1.0,    -1.0,-1.0, 1.0,    1.0,-1.0,1.0,   1.0,-1.0,1.0 ] ), gl.STATIC_DRAW );


    this.program = gl.createProgram();
    this.vs = this.createShader( this.vertexShader, gl.VERTEX_SHADER );
    this.fs = this.createShader( this.fragmentShader, gl.FRAGMENT_SHADER );
    if ( this.vs == null || this.fs == null ) return null;


    gl.attachShader( this.program, this.vs );
    gl.attachShader( this.program, this.fs );
    gl.deleteShader( this.vs );
    gl.deleteShader( this.fs );
    gl.linkProgram( this.program );
    if ( !gl.getProgramParameter( this.program, gl.LINK_STATUS ) ) {
      var error = gl.getProgramInfoLog( this.program );
      console.log(this.name, 'fragmentShader:');
      console.log(this.fragmentShader);
      console.log(this.vertexShader);
      console.error( error );
      console.error( 'VALIDATE_STATUS: ' + gl.getProgramParameter( this.program, gl.VALIDATE_STATUS ), 'ERROR: ' + gl.getError() );
      let err = gl.getShaderInfoLog(this.fs);
      err = err.split('ERROR:')[1].split(':')[1];
      console.error(this.name+'  '+gl.getShaderInfoLog(this.fs)+'\n'+err+'\n'+this.fragmentShader.split('\n')[err-1]);
      
      return;
    }

    //UNIFORMS
    for (var key in this.uniforms){
      this.cacheUniformLocation( this.program, this.uniforms[key]['name']);
    };


    if (this.inputs.length > 0) {
        this.cacheUniformLocation(this.program, 'sTD2DInputs[0]');
    }

     // Load program into GPU
    gl.useProgram(this.program);
    this.screenVertexPosition = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(this.screenVertexPosition);


    //UNIFORMS SET VALS
    for (var key in this.uniforms){
      if (this.uniforms[key]['type'] == '1f') gl.uniform1f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0] );
      if (this.uniforms[key]['type'] == '2f') gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1] );
      if (this.uniforms[key]['type'] == '3f') gl.uniform3f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1],this.uniforms[key]['vals'][2] );
      if (this.uniforms[key]['type'] == '4f') gl.uniform4f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1] ,this.uniforms[key]['vals'][2] ,this.uniforms[key]['vals'][3] );
      if (this.uniforms[key]['name'] == 'resolution') gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.width, this.height );
      if (this.uniforms[key]['name'] == 'res') gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.width, this.height );
      
    };

    //OUTPUT
    this.output = this.createTarget( this.width, this.height, gl.UNSIGNED_BYTE );
    // this.output = this.createTarget( this.width, this.height, gl.FLOAT );
    gl.useProgram(null);
  }

  setUniform1f(name,vals) {
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.program.uniformsCache[name], vals[0]);
    this.gl.useProgram(null);
  }

   setUniform2f(name,vals){
    this.gl.useProgram(this.program);
    this.gl.uniform2f(this.program.uniformsCache[name], vals[0],vals[1]);
    this.gl.useProgram(null);
  }

   setUniform3f(name,vals){
    this.gl.useProgram(this.program);
    this.gl.uniform3f(this.program.uniformsCache[name], vals[0],vals[1],vals[2]);
    this.gl.useProgram(null);
  }

  setUniform4f(name,vals){
    this.gl.useProgram(this.program);
    this.gl.uniform4f(this.program.uniformsCache[name], vals[0],vals[1],vals[2],vals[3]);
    this.gl.useProgram(null);
  }


  render(){
    const gl = this.gl;
    gl.useProgram(this.program);

    //INPUT UNIFORMS

    if (this.inputs.length > 0){
      let samplerIndices = new Int32Array(this.inputs.length);
      for (let i = 0; i < this.inputs.length; i++){
          samplerIndices[i] = i;
          gl.activeTexture( gl.TEXTURE0 + i );
          gl.bindTexture( gl.TEXTURE_2D, this.inputs[i].output.texture );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.uniform1iv(this.program.uniformsCache['sTD2DInputs[0]'], samplerIndices);
    }

    //OUTPUT
    if (gl.getContextAttributes().antialias){
    if(!this.toScreen) gl.bindFramebuffer( gl.FRAMEBUFFER, this.output.framebuffer ); //SWITCH TO SCREEN HERE
    else gl.bindFramebuffer( gl.FRAMEBUFFER, null ); 
    gl.viewport(0, 0, this.width, this.height);
    gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
    gl.vertexAttribPointer( this.screenVertexPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.useProgram(null);
  }

  else{
    //NON AA FRO GL
    gl.bindFramebuffer( gl.FRAMEBUFFER, this.output.framebuffer );
    gl.viewport(0, 0, this.width, this.height);
    gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer );
    gl.vertexAttribPointer( this.screenVertexPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, 6 );
    gl.useProgram(null);


    if (this.toScreen) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.output.framebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(
        0, 0, this.width, this.height, // source rectangle
        0, 0, this.width, this.height, // destination rectangle
        gl.COLOR_BUFFER_BIT,           // which buffers to copy
        gl.NEAREST                     // filtering method
      );
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
  }


  }

  updateViewerCoord(viewport){

    let rect = this.opUI.texture.getBoundingClientRect();
    this.u0 = rect.left/viewport.width;
    this.u1 = rect.right/viewport.width;
    this.v0 = 1-rect.bottom/viewport.height;
    this.v1 = 1-rect.top/viewport.height;
  }
  

  //UI
  createUIbyClass(){

    this.opUI.op.style.backgroundColor =  'rgba(0, 0, 0, 0.1)';

    this.opUI.texture = document.createElement('div');
    this.opUI.texture.classList.add('texture');
    this.opUI.op.appendChild(this.opUI.texture);
    
    this.opUI.name = document.createElement('div');
    this.opUI.name.classList.add('topName');
    this.opUI.op.appendChild(this.opUI.name);
    this.opUI.name.textContent = this.name

    this.opUI.cook = document.createElement('div');
    this.opUI.cook.classList.add('cook');
    this.opUI.op.appendChild(this.opUI.cook);
    this.opUI.cook.textContent = '0000';
  }

  updateUI(){
    this.opUI.cook.textContent = '';//(this.cook).toFixed(4);
    
  }
  
}


//=============================== COMP ========================

class COMP extends OP{
  constructor(...args) {
    super(...args);
    this.parent = parent;
    this.family = 'COMP';
    this.inputOps = [];
    this.currentChild = null;
    this.selectedChildren = [];
    this.childOps = [];
    
  }
  
  updateDo(){ 
  }
  
  initFamily(){
    this.childOps.forEach((op) => {
      if(['inCHOP','inTOP','inMAT','inSOP','inDAT'].includes(op.OPType)){
      }
    });
  }

  findChildren(){
    let children = [];
    const getChilds = (cOp) => {
      cOp.childOps.forEach((op) => {
        children.push(op);
        if (op.family == 'COMP') getChilds(op);
      });
    };
    getChilds(this);

    return children;
  }

  //UI
  createUIbyClass(){
    
    this.opUI.op.addEventListener('dblclick', (event) => onDoubleClickCOMP(event, this));
    this.opUI.name = document.createElement('div');
    this.opUI.name.classList.add('compName');
    this.opUI.op.appendChild(this.opUI.name);
    this.opUI.name.textContent = this.name
    
  }

  updateUI(){
    
  }
  
}



//=============================== CHOP ========================

class CHOP extends OP{
  constructor(...args) {
    super(...args);
    this.family = 'CHOP';
    this.numChans = 1;

    
  }
  chans = [];
  minUi = 0;
  maxUi = 1;
  
  initFamily(){
    this.chans = new Array(this.numChans).fill(0);
  }

  //UI
   createUIbyClass(){
    // this.opUI.op = document.createElement('div');
    // this.opUI.op.classList.add('op');
    // document.body.appendChild(this.opUI.op);
    // this.opUI.op.addEventListener('click', (event) => onOpClick(event, this));
    // this.opUI.op.style.top =this.nodeY*window.innerHeight+'px';
    // this.opUI.op.style.left =this.nodeX*window.innerWidth+'px';



    for (let i = 0;i<this.chans.length; i++){
      this.opUI[i] = document.createElement('div');
      this.opUI[i].classList.add('chan');
      this.opUI.op.appendChild(this.opUI[i]);
      this.opUI[i].textContent = this.chans[i];

      //bars
      this.opUIbars[i] = document.createElement('div');
      this.opUIbars[i].classList.add('chanBar');
      this.opUI.op.appendChild(this.opUIbars[i]);


    }
    this.opUI.name = document.createElement('div');
    this.opUI.name.classList.add('chopName');
    this.opUI.op.appendChild(this.opUI.name);
    this.opUI.name.textContent = this.name

    this.opUI.cook = document.createElement('div');
    this.opUI.cook.classList.add('cook');
    this.opUI.op.appendChild(this.opUI.cook);
    
  }

  updateUI(){
    for (let i = 0;i<this.chans.length; i++){
      this.opUI[i].textContent = (this.chans[i]).toFixed(8);
      this.opUIbars[i].style.width = (this.chans[i]-this.minUi)/(this.maxUi-this.minUi)*100 + '%';
      if(this.chans[i]<this.minUi) this.minUi = this.chans[i]*1;
      if(this.chans[i]>this.maxUi) this.maxUi = this.chans[i]*1;
      this.opUI.cook.textContent = '';//(this.cook).toFixed(4);


    }
  }
  
}



//=============================== OutTOP ========================
class OutTOP extends TOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source 1'], ['Output']);
    this.OPType = 'outTOP';
    this.minInputs = 1;
    this.maxInputs = 1;



    this.fragmentShader = "# version 300 es \nprecision highp float;\nin vec3 vUV;\nuniform sampler2D sTD2DInputs[1];\n@TDUniforms@\nuniform vec2 resolution;\nuniform float time;\nout vec4 fragColor;\nvoid main()\n{\nvec4 c = texture(sTD2DInputs[0], vUV.st);\nfragColor = (c);\n}\n";
    
  }

  updateDo(){ 
    this.render();
  }
  
}




//=============================== GlslmultiTOP ========================
class GlslmultiTOP extends TOP{
  constructor(name, time, gl) {
    super(name, time, gl, false, ['Source 1'], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 9999;



  }
  

  updateDo(){ 
    this.render();
  }

}




//=============================== BaseCOMP ========================
class BaseCOMP extends COMP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], []);
    this.minInputs = 0;
    this.maxInputs = 0;
  }
}

//=============================== MoviefileinTOP ========================
class MoviefileinTOP extends TOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 0;

    this.OPType = 'moviefileinTOP';
    this.fragmentShader = `#version 300 es
    precision highp float;

    uniform sampler2D textTexture;
    uniform vec2 resolution;

    out vec4 fragColor;

    void main() {
      vec2 uv = gl_FragCoord.xy/resolution.xy;

        fragColor = texture(textTexture, vec2(uv.x, 1.0-uv.y));
        //fragColor.rgb = gl_FragCoord.rgb * fra
        // fragColor = vec4(mod(uv.x*10.,1.),mod(uv.y*10.,1.),0.,1.);
    }`;

    // Append a uniform for the text texture
    this.appendUniform("textTexture", "1i", [0]);
    this.textCanvas = null;
    this.textTexture = null;
  }

  onCompile(){
    this.textCanvas = document.createElement("canvas");
    this.textCanvas.width = this.width;
    this.textCanvas.height = this.height;
    console.log('ON COMPILE IMG:',this.textCanvas);
    
    const img = new Image();
    img.src = this.par.file;
    img.onload = () => {
        
        this.textCanvas.width = this.width;
        this.textCanvas.height = this.height;
        const ctx = this.textCanvas.getContext("2d", { alpha: true });
        ctx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
          
        //PREMULT ALPHA??
        // Disable image smoothing to prevent alpha premultiplication
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, this.textCanvas.width, this.textCanvas.height);
        
        console.log('IMAGE RESOLUTION: ', this.width, this.height);

    
        //COMMON
        this.initTextCanvas();
        this.compile();
    };
    
  }

  resize(){
    for (let j = 0; j< this.inputs.length; j++) {this.inputs[j].resize();}
  }


  initTextCanvas() {

    this.textTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.textCanvas
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  // Render the text texture
  render() {
    this.gl.useProgram(this.program);

    // Bind the text texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);

    // Set uniforms
    this.gl.uniform1i(this.program.uniformsCache["textTexture"], 0);

    // Set the output target and draw
    if (!this.toScreen) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.output.framebuffer);
      
      //PREMULT ALPHA??
      // Disable blending to prevent alpha premultiplication
      this.gl.disable(this.gl.BLEND);
      
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, this.width, this.height);
    // Bind buffer and draw
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.vertexAttribPointer(this.screenVertexPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

   updateDo(){ 
    this.render();
  }
}




//=============================== ContainerCOMP ========================
class ContainerCOMP extends COMP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], []);
    this.minInputs = 0;
    this.maxInputs = 1;
	}  
}


//=============================== LimitCHOP ========================
class LimitCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source 1'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 1;

    //pars:
this.par.type = 0;  //Type:  0: Off  1: Clamp  2: Loop  3: Zigzag
this.par.min = -1.0;  //Minimum
this.par.max = 1.0;  //Maximum
this.par.normrange1 = -1.0;  //Normalize Range
this.par.normrange2 = 1.0;  //Normalize Range
this.par.quantvalue = 0;  //Quantize Value:  0: Off  1: Ceiling  2: Floor  3: Round
this.par.vstep = 0.1;  //Value Step
this.par.voffset = 0.0;  //Value Offset
this.par.quantindex = 0;  //Quantize Index:  0: Off  1: Offset Relative to Start  2: Offset Relative to Zero
this.par.istep = 0.1;  //Step
this.par.istepunit = 2;  //Step Unit:  0: I  1: F  2: S  3: %
this.par.ioffset = 0.0;  //Offset
this.par.ioffsetunit = 2;  //Offset Unit:  0: I  1: F  2: S  3: %
this.par.scope = 0;  //Scope:  0: *  1: chan1
this.par.srselect = 1;  //Sample Rate Match:  0: Resample At First Input's Rate  1: Resample At Maximum Rate  2: Resample At Minimum Rate  3: Error If Rates Differ
this.par.exportmethod = 0;  //Export Method:  0: DAT Table by Index  1: DAT Table by Name  2: Channel Name is Path:Parameter
 
  }

  clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

  updateDo(){
    
    this.chans = this.inputs[0].chans.slice();
    
    for (let i=0; i<this.chans.length;i++){
        
         this.chans[i] = this.clamp( this.chans[i],this.par.min,this.par.max);
        
    }
  }
}



//=============================== MathCHOP ========================
class MathCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, false, ['Source 1'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 9999;



    //pars:
    this.par.preop = 0; //0. Off, 1. Negate, 2. Positive, 3. Root, 4. Square, 5. Inverse
    this.par.chanop = 0; //0. Off, 1. Add, 2. Subtract, 3. Multiply, 4. Divide, 5. Average, 6. Minimum, 7. Maximum, 8. Length
    this.par.chopop = 0; //0. Off, 1. Add, 2. Subtract, 3. Multiply, 4. Divide, 5. Average, 6. Minimum, 7. Maximum, 8. Length
    this.par.postop = 0; //0. Off, 1. Negate, 2. Positive, 3. Root, 4. Square, 5. Inverse
    this.par.match = 0; //0. Channel Number, 1. Channel Name
    this.par.align = 0; //0. Automatic, 1. Extend to Min/Max, 2. Stretch to Min/Max, 3. Shift to Minimum, 4. Shift to Maximum, 5. Shift to First Interval, 6. Trim to First Interval, 7. Stretch to First Interval, 8. Trim to Smallest Interval, 9. Stretch to Smallest Interval
    this.par.interppars = 0;
    this.par.integer = 0; //0. Off, 1. Ceiling, 2. Floor, 3. Round
    this.par.preoff = 0.0;
    this.par.gain = 1.0;
    this.par.postoff = 0.0;
    this.par.fromrange1 = 0.0;
    this.par.fromrange2 = 1.0;
    this.par.torange1 = 0.0;
    this.par.torange2 = 1.0;
    //vars


   
  }

  combine(a,b,type){
    if(type == 1)return a+b;
    if(type == 2)return a-b;
    if(type == 3)return a*b;
    if(type == 4)return a/b;
    if(type == 5)return (a+b)/2;
    if(type == 6)return Math.min(a,b);
    if(type == 7)return Math.max(a,b);
    
  }



  preop(a,type){ //ONLY THIS
    if(type == 0) return a;
    if(type == 1) return -a;
    if(type == 2) return Math.abs(a);
    if(type == 3) return Math.sqrt(a);
    if(type == 4) return Math.pow(a,2);
    if(type == 5) {
      if(a==0)return a;
      else return 1/a;
    }
    return a
  }

  combineChans(a){
    if (this.par.chanop == 0) {
      let v =[];
      for(let i = 0; i< a.length; i++){
        v.push(this.preop(a[i],this.par.preop));
      }
      return v;
    }
    else{
      let v = this.preop(a[0],this.par.preop);
      for(let i = 1; i< a.length; i++){
        v = this.combine(v,this.preop(a[i],this.par.preop),this.par.chanop);
      }
      return [v]
    }
  }

  combineChops(a){
    let b = [];
    if (this.par.chopop == 0){
      for(let i=0;i<a.length; i++){
        for(let j=0;j<a[i].length; j++){
          b.push(this.preop(a[i][j],this.par.postop));
        }
      }
    }
    
    else {
      let c = a[0].slice();

      for(let i=1;i<a.length; i++){
        for(let j=0;j<c.length; j++){
          c[j] = this.combine(c[j],a[i][j],this.par.chopop)
        }
      }

      for(let i=0;i<c.length; i++){
        b.push(this.preop(c[i],this.par.postop));
      }
    }
    return b;
  }

  updateDo(){
    
    this.chans = this.inputs[0].chans.slice();
    

    let prechans =[];
    for (let i = 0; i< this.inputs.length; i++){
      prechans.push(this.combineChans(this.inputs[i].chans))
    }

    prechans = this.combineChops(prechans);

    this.chans = [];
    for (let i=0; i<prechans.length;i++){
        
        
        //Mult-Add Page
        prechans[i] += this.par.preoff; 
        prechans[i] *= this.par.gain;
        prechans[i] += this.par.postoff;

        //Range page
        prechans[i] = (prechans[i]-this.par.fromrange1)/(this.par.fromrange2-this.par.fromrange1)*(this.par.torange2-this.par.torange1)+this.par.torange1;
        this.chans.push(prechans[i]);
    }
  }
}



//=============================== OutCHOP ========================
class OutCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source 1'], ['Output']);
    this.OPType = 'outCHOP';
    this.minInputs = 1;
    this.maxInputs = 1;


    //pars:
  }
  

  updateDo(){ 

      this.chans = this.inputs[0].chans.slice();     
  }

  setVals(chans){

    }
}



//=============================== MergeCHOP ========================
class MergeCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, false, ['Source 1'], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 9999;

    //pars:
    
    //vars


   
  }

  updateDo(){
    
    this.chans = this.inputs[0].chans.slice();
    for (let j = 1; j< this.inputs.length; j++){
      this.chans = this.chans.concat(this.inputs[j].chans.slice());
    }      

  }
}



//=============================== SelectCHOP ========================
class SelectCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, false, ['Source'], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 9999;

    //pars:
    this.par.chans = [];
    //vars


   
  }

  updateDo(){
    
    this.chans = [];
    for (let i = 0; i< this.par.chans.length; i++){
      this.chans.push(this.inputs[0].chans[this.par.chans[i]]*1);
    }      

  }
}



//=============================== NullCHOP ========================
class NullCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source 1'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 1;

    //pars:
  }
  

  updateDo(){ 

      this.chans = this.inputs[0].chans.slice();     
  }

  setVals(chans){

    }
}



//=============================== KeyboardinCHOP ========================
class KeyboardinCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], ['Output']);
    this.OPType = 'keyboardinCHOP';
    this.minInputs = 0;
    this.maxInputs = 0;


    this.par.active = 1;  //Active:  0: Off  1: On  2: While Playing
    this.par.keys = 1;  //Keys:  0: 0  1: 1  2: 2  3: 3  4: 4  5: 5  6: 6  7: 7  8: 8  9: 9  10: A  11: B  12: C  13: D  14: E  15: F  16: G  17: H  18: I  19: J  20: K  21: L  22: M  23: N  24: O  25: P  26: Q  27: R  28: S  29: T  30: U  31: V  32: W  33: X  34: Y  35: Z  36: Comma ,  37: Period .
    this.par.modifiers = 0;  //Modifier Keys:  0: Ignore  1: None  2: Control  3: Alt  4: Control and Alt  5: Shift  6: Shift and Alt  7: Shift and Control  8: Shift and Control and Alt
    this.par.channelnames = 0;  //Channel Names:  0: by Key Name  1: by Channel Number
    this.par.rate = 60.0;  //Sample Rate
    this.par.left = 0;  //Extend Left:  0: Hold  1: Slope  2: Cycle  3: Mirror  4: Default Value
    this.par.right = 0;  //Extend Right:  0: Hold  1: Slope  2: Cycle  3: Mirror  4: Default Value
    this.par.defval = 0.0;  //Default Value
    this.par.timeslice = 0;  //Time Slice
    this.par.scope = 0;  //Scope:  0: *
    this.par.srselect = 1;  //Sample Rate Match:  0: Resample At First Input's Rate  1: Resample At Maximum Rate  2: Resample At Minimum Rate  3: Error If Rates Differ
    this.par.exportmethod = 0;  //Export Method:  0: DAT Table by Index  1: DAT Table by Name  2: Channel Name is Path:Parameter

    this.doChannels =[];
    this.chans = [0,0,0,0]; //left right up down


  }

  updateDo(){ 

  }


  doInit(){
      window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

  handleKeyDown(e) {
    // Using e.code for more consistent key identification
    switch(e.code) {
      case "ArrowLeft":
        this.chans[0] = 1;
        break;
      case "ArrowRight":
        this.chans[1] = 1;
        break;
      case "ArrowUp":
        this.chans[2] = 1;
        break;
      case "ArrowDown":
        this.chans[3] = 1;
        break;
      default:
        break;
    }
    
  }

  handleKeyUp(e) {
    switch(e.code) {
      case "ArrowLeft":
        this.chans[0] = 0;
        break;
      case "ArrowRight":
        this.chans[1] = 0;
        break;
      case "ArrowUp":
        this.chans[2] = 0;
        break;
      case "ArrowDown":
        this.chans[3] = 0;
        break;
      default:
        break;
    }
  }


  

  setVals(chans){
  }
}




//=============================== HoldCHOP ========================
class HoldCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source','Trigger'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 2;

    //pars:
    this.par.sample = 0;  //Sample:  0: Off to On  1: While On  2: On to Off  3: While Off  4: On Value Change
    this.par.scope = 0;  //Scope:  0: *
    this.par.exportmethod = 0;  //Export Method:  0: DAT Table by Index  1: DAT Table by Name  2: Channel Name is Path:Parameter

  }

  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  

  sample(i){
    this.chans[i] = this.inputs[0].chans[i]*1;
  }

  updateDo(){
    
     this.gates = this.inputs[1].chans.slice();
    
    
    if (this.par.sample == 0){ //OFF TO ON

      for (let i = 0; i < this.inputs[0].chans.length; i++){
        const gateIndex = this.clamp(i, 0, this.maxGatesIndex);
        if(this.prevGates[gateIndex]<=0 && this.gates[gateIndex]>0){
          this.sample(i);
        }
      }
      this.prevGates = this.inputs[1].chans.slice();
    }

    if (this.par.sample == 1){ //WHILE ON

      for (let i = 0; i < this.inputs[0].chans.length; i++){
        const gateIndex = this.clamp(i, 0, this.maxGatesIndex);
        if(this.gates[gateIndex]>0){
          this.sample(i);
        }
      }
      this.prevGates = this.inputs[1].chans.slice();
    }

    if (this.par.sample == 2){ //ON TO OFF

      for (let i = 0; i < this.inputs[0].chans.length; i++){
        const gateIndex = this.clamp(i, 0, this.maxGatesIndex);
        if(this.prevGates[gateIndex]>0 && this.gates[gateIndex]<=0){
          this.sample(i);
        }
      }
      this.prevGates = this.inputs[1].chans.slice();
    }

    if (this.par.sample == 3){ //WHILE OFF

      for (let i = 0; i < this.inputs[0].chans.length; i++){
        const gateIndex = this.clamp(i, 0, this.maxGatesIndex);
        if(this.gates[gateIndex]<=0){
          this.sample(i);
        }
      }
      this.prevGates = this.inputs[1].chans.slice();
    }

    if (this.par.sample == 4){ //VALUE CHANGE

      for (let i = 0; i < this.inputs[0].chans.length; i++){
        const gateIndex = this.clamp(i, 0, this.maxGatesIndex);
        if(this.gates[gateIndex]!=this.prevGates[gateIndex]){
          this.sample(i);
        }
      }
      this.prevGates = this.inputs[1].chans.slice();
    }

   
  }

  doInit(){
    this.maxGatesIndex = this.inputs[1].chans.length-1;
    this.chans = this.inputs[0].chans.slice();
    this.prevGates = this.inputs[1].chans.slice();
  }
}


//=============================== MouseinCHOP ========================
class MouseinCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 0;

    this.par.active = 1; //0. Off, 1. On, 2. While Playing
    this.par.output = 0; //0. Normalized, 1. Normalized Aspect, 2. Absolute
    this.par.wheelinc = 0.005;
    this.doChannels =[];
    this.chans = [];


  }

  updateDo(){ 

  }


  init(){
    const documentWidth = window.innerWidth;
    const documentHeight = window.innerHeight;
    const aspect = documentWidth/documentHeight;
    let buttonsMap = [-1,-1,-1];
    let wheelChan = -1;
    console.log('DOCHEIGHT: ', documentHeight);

    // Prevent default touch and hold (long tap) behavior
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Prevent text selection on touch devices
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });

    for (let i=0;i<this.doChannels.length;i++){
      this.chans.push(0);


      if (this.doChannels[i]=='posxname') {
        // Mouse move event
        document.addEventListener("mousemove", (e) => {
          this.handlePointerMove(e, i, documentWidth);
        });
        // Touch move and start events
        document.addEventListener("touchmove", (e) => {
          e.preventDefault();
          const touch = e.touches[0];
          this.handlePointerMove(touch, i, documentWidth);
        });
        document.addEventListener("touchstart", (e) => {
          e.preventDefault();
          const touch = e.touches[0];
          this.handlePointerMove(touch, i, documentWidth);
        });
      }

      if (this.doChannels[i]=='posyname') {
        // Mouse move event
        document.addEventListener("mousemove", (e) => {
          this.handlePointerMoveY(e, i, documentHeight, aspect);
        });
        // Touch move and start events
        document.addEventListener("touchmove", (e) => {
          e.preventDefault();
          const touch = e.touches[0];
          this.handlePointerMoveY(touch, i, documentHeight, aspect);
        });
        document.addEventListener("touchstart", (e) => {
          e.preventDefault();
          const touch = e.touches[0];
          this.handlePointerMoveY(touch, i, documentHeight, aspect);
        });
      }

      if (this.doChannels[i]=='wheel')
        document.addEventListener("wheel", (e) => {
          const chanIndex = i;
          if(e.deltaY>0)this.chans[chanIndex]-=this.par.wheelinc;
          if(e.deltaY<0)this.chans[chanIndex]+=this.par.wheelinc;
        });

      if (this.doChannels[i]=='lbuttonname')buttonsMap[0] = i;
      if (this.doChannels[i]=='mbuttonname')buttonsMap[1] = i;
      if (this.doChannels[i]=='rbuttonname')buttonsMap[2] = i;
     
      


    }

    // Handle mouse events
    document.addEventListener("mousedown", (event) => {
      const curButtonChan = buttonsMap[event.button];
      if(curButtonChan>-1) this.chans[curButtonChan] = 1;
    });

    document.addEventListener("mouseup", (event) => {
      const curButtonChan = buttonsMap[event.button];
      if(curButtonChan>-1) this.chans[curButtonChan] = 0;
    });

    // Handle touch events
    document.addEventListener("touchstart", (event) => {
      const curButtonChan = buttonsMap[0]; // Treat touch as left click
      if(curButtonChan>-1) this.chans[curButtonChan] = 1;
    });

    document.addEventListener("touchend", (event) => {
      const curButtonChan = buttonsMap[0]; // Treat touch as left click
      if(curButtonChan>-1) this.chans[curButtonChan] = 0;
    });



  }

  // Helper methods for pointer movement
  handlePointerMove(e, chanIndex, documentWidth) {
    let v = (e.clientX/documentWidth-0.5)*2;
    if (this.par.output == 2) v = e.clientX;
    this.chans[chanIndex] = v;
  }

  handlePointerMoveY(e, chanIndex, documentHeight, aspect) {
    let v = documentHeight-e.clientY;
    if (this.par.output == 0) v = (v/documentHeight-0.5)*2;
    if (this.par.output == 1) v = (v/documentHeight-0.5)/aspect*2;
    if (this.par.output == 2) v = v;
    this.chans[chanIndex] = v;
  }

  

  setVals(chans){
    this.chans = chans;
    let k = 0;
    for (const [key, value] of Object.entries(this.par)) {
      this.parMap[key] = k;
      k+=1;
    }
   
  }
}




//=============================== SpeedCHOP ========================
class SpeedCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source','Reset'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 2;

    //pars:
    this.par.order = 0; //0. First, 1. Second, 2. Third
    this.par.constant1 = 0.0;
    this.par.constant2 = 0.0;
    this.par.constant3 = 0.0;
    this.par.limittype = 0; //0. Off, 1. Clamp, 2. Loop, 3. Zigzag
    this.par.min = 0.0;
    this.par.max = 1.0;
    this.par.speedsamples = 0;
    this.par.resetcondition = 1; //0. Off to On, 1. While On, 2. On to Off, 3. While Off
    this.par.resetvalue = 0.0;
    this.par.reset = 0;
    this.par.resetonstart = 1;


    //vars:
    this.prev = 0;

  }
  
  clampSpeed(x,a,b){
    if(x>b)return b*1;
    if(x<a)return a*1;
    return x*1;
  }


  loopSpeed(x,a,b){
    if(x>b){
      while(x>b) x = x-b+a;
    }
    if(x<a){
      while(x<a) x = b-(x-a);
    }
    return x;
  }

  doInit(){
    this.reset();
    
  }

  reset(){
    for (let i = 0; i<this.chans.length; i++)this.chans[i] = this.par.resetvalue*1;
  }

  updateDo(){ 

      
      for (let i = 0; i<this.chans.length; i++){
        this.chans[i] += this.time.deltas*this.inputs[0].chans[i];
        if (this.par.limittype == 1) this.chans[i] = this.clampSpeed(this.chans[i]*1,this.par.min, this.par.max);
        if (this.par.limittype == 2) this.chans[i] = this.loopSpeed(this.chans[i]*1,this.par.min, this.par.max);

        if (this.par.reset > 0) this.reset();


      }

      //reset on 2nd input
      if (this.inputs[1] !== undefined){
        
        //offToOn
        if (this.par.resetcondition == 0 && this.prev <= 0 && this.inputs[1].chans[0]*1>0){
          this.reset()
        }

        //whileOn
        if (this.par.resetcondition == 1 && this.inputs[1].chans[0]*1>0){
          this.reset()
        }

         //onToOff
        if (this.par.resetcondition == 2 && this.prev > 0 && this.inputs[1].chans[0]*1<=0){
          this.reset()
        }

        //whileOff
        if (this.par.resetcondition == 3 && this.inputs[1].chans[0]*1<=0){
          this.reset()
        }
        this.prev = this.inputs[1].chans[0]*1;
      }
      
     
  }

  setVals(chans){
    this.chans = chans.slice();
    // if (this.inputs[1] === undefined) this.inputs[1] = 0;
  }
}







//=============================== FilterCHOP ========================
class FilterCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source','Reset'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 2;

    //pars:
    this.par.type = 0; //0. Gaussian, 1. Left Half Gaussian, 2. Box, 3. Left Half Box, 4. Edge Detect, 5. Sharpen, 6. De-spike, 7. Ramp Preserve, 8. One Euro
    this.par.effect = 1.0;
    this.par.width = 1.0;
    this.par.widthunit = 2; //0. I, 1. F, 2. S, 3. %
    this.par.spike = 0.10000000149011612;
    this.par.ramptolerance = 4.0;
    this.par.ramprate = 60.0;
    this.par.passes = 1;
    this.par.filterpersample = 0;
    this.par.cutoff = 1.0;
    this.par.speedcoeff = 2.0;
    this.par.slopecutoff = 1.0;
    this.par.reset = 0;
    this.prevWidth = this.par.width*1;


    //vars:
    this.filterWindow = []; //0. end, 1. attak,2.decay, 3.sustain, 4.release
    this.filterSum = 0;

  }
  

  updateDo(){ 
      if(this.prevWidth != this.par.width) this.setVals(this.chans.slice());
      this.chans = this.inputs[0].chans.slice();
      for (let i = 0; i<this.chans.length; i++){
        this.windows[i].push(this.chans[i]*1);
        this.windows[i].shift();
        // console.log(this.windows[i]);
        let val = 0;
        for (let j = 0; j<this.windows[i].length; j++){
          val += this.windows[i][j]*this.filter[j];
        }
        
        this.chans[i] = val/this.filterSum;
      }


      //this.prev = this.inputs[0].chans.slice();
     
  }

  setVals(chans){
    let filterWidth = Math.max(Math.floor(this.par.width*this.time.rate),1);

    this.chans = chans.slice();
    this.windows = Array(this.chans.length);
    for (let i = 0; i<this.chans.length; i++){
      this.windows[i] = Array(filterWidth);
       for (let j = 0; j<this.windows[i].length; j++){
        this.windows[i][j] = this.chans[i];
       }
    }
    this.filter = Array(this.windows[0].length);
    if (this.filter.length < 2) this.filter = [1];
    else{
      for (let i = 0; i<this.filter.length; i++){
          this.filter[i] = Math.sin(i/(this.filter.length-1)*Math.PI);
          this.filter[i] = Math.pow(this.filter[i],4);
         }
    }
    var filterSum = 0;
    this.filter.forEach(function(num) { filterSum += num });
    this.filterSum = filterSum;
    
    this.prevWidth = this.par.width*1;
  }
}


//=============================== SPRITES =====================
class ConvertedGLSLs_circles extends OP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source'], ['Output']);
    this.gl = gl;
    this.family = 'TOP';
    this.par.outputresolution = 9;  //Output Resolution:  0: Use Input  1: Eighth  2: Quarter  3: Half  4: 2X  5: 4X  6: 8X  7: Fit Resolution  8: Limit Resolution  9: Custom Resolution  10: Parent Panel Size
    this.par.resolutionw = 1000;  //Resolution
    this.par.resolutionh = 1000;  //Resolution
    this.width = 1000;
    this.height = 1000;
    this.fixedResInput = 0;
    this.minInputs = 0;
    this.maxInputs = 1;

    this.sprites = [];
    this.spriteData = null;
    this.numSprites = 0;
    this.vao = null;  // Add VAO property

    this.vertexShader =`#version 300 es
  in vec2 position;
  in vec3 instancePosition; // x, y, size
  in vec4 instanceTexCoords; // startU, startV, endU, endV
  in vec3 instanceColor;    // r, g, b
  out vec2 vUV;
  out vec4 vTexCoords;
  out vec3 vColor;
  void main() {
    vec2 pos = position * instancePosition.z + instancePosition.xy * 2.0 - 1.0;
    gl_Position = vec4(pos, 0.0, 1.0);
    vUV = position * 0.5 + 0.5;
    vTexCoords = instanceTexCoords;
    vColor = instanceColor;
  }`;
  
  this.fragmentShader = `#version 300 es
  precision highp float;
  in vec2 vUV;
  in vec4 vTexCoords;
  in vec3 vColor;
  out vec4 fragColor;
  uniform sampler2D sTD2DInputs[1];
  @TDUniforms@
  
void main()
{  
    float dist = length(vUV - vec2(0.5));
    float alpha = smoothstep(0.5, 0.48, dist);
    // vec2 texCoord = mix(vTexCoords.xy, vTexCoords.zw, vUV);
    vec4 c = texture(sTD2DInputs[0], vUV.st);
    fragColor = vec4(vColor*c.rgb, c.a);
}`;

  this.program;
  this.uniforms = [];
  this.output;
  this.resX;
  this.resY;
  this.buffer;
  this.toScreen = false;
  }

  appendUniform(name, type, vals){
    var c = {'name':name, 'type':type, 'vals': vals};
    let existingUniform = this.uniforms.find(u => u.name === name);
    if (existingUniform) {
        existingUniform.vals = vals;
    } else {
        this.uniforms.push(c);
    }
  }


  createTarget( width, height, type ) {
    var target = {};
    var gl = this.gl;
    target.framebuffer = gl.createFramebuffer();
    target.renderbuffer = gl.createRenderbuffer();
    target.texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, target.texture );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindFramebuffer( gl.FRAMEBUFFER, target.framebuffer );
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0 );
    gl.bindTexture( gl.TEXTURE_2D, null );
    gl.bindRenderbuffer( gl.RENDERBUFFER, null );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null);
    return target;

  }

  createShader( src, type ) {
    var shader = this.gl.createShader( type );
    this.gl.shaderSource( shader, src );
    this.gl.compileShader( shader );
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', this.path, this.gl.getShaderInfoLog(shader));
        const shaderSourceLines = src.split("\n");
        shaderSourceLines.forEach((line, index) => {
          console.log(`${index + 1}: ${line}`);
        });
        this.gl.deleteShader(shader);
        return null;
    }
    // console.log(this.name, src);
    return shader;
  }

  cacheUniformLocation( program, label ) {
    if ( program.uniformsCache === undefined ) {
      program.uniformsCache = {};
    }
    program.uniformsCache[ label ] = this.gl.getUniformLocation( program, label );
  }

  setResolution(){
    if (this.par.outputresolution == 0){ //USE INPUT
      if(this.inputs.length == 0){
        this.width = this.par.resolutionw;
        this.height = this.par.resolutionh;
      }
      else{
        const inOp = this.inputs[this.fixedResInput];
        // console.log('=========>> RES FROM INPUT',inOp.name)
        this.width = inOp.width;
        this.height = inOp.height;
      }
    }
    if (this.par.outputresolution == 9){
      this.width = this.par.resolutionw;
      this.height = this.par.resolutionh;
    }

    if (this.par.outputresolution == 10){
      this.width = this.gl.drawingBufferWidth;
      this.height = this.gl.drawingBufferHeight;
    }

    this.appendUniform('resolution','2f',[this.width,this.height]);
    
    let N = this.inputs.length;
    if (N>0){
      for (let i=0; i<N; i++){
        this.appendUniform(`uTD2DInfos[${i}].res`,'4f', [1./this.inputs[i].width, 1./this.inputs[i].height, this.inputs[i].width, this.inputs[i].height]);
        this.appendUniform(`uTD2DInfos[${i}].depth`,'4f',[1.,1.,1.,1.]);
        
      }
      
    }
  }

  insertTDUniforms(){
    let example = '';
    let texInfoArray = [];
    let N = this.inputs.length;

    if (N>0){
      for (let i=0; i<N; i++){
        texInfoArray.push(`TDTexInfo(vec4(1./${Math.round(this.inputs[i].width)}., 1./${Math.round(this.inputs[i].height)}., ${Math.round(this.inputs[i].width)}., ${Math.round(this.inputs[i].height)}.), vec4(1.))`)
      }
      example = `
  struct TDTexInfo {
    vec4 res;
    vec4 depth;
  };

  uniform TDTexInfo uTD2DInfos[${N}];
  const int TD_NUM_2D_INPUTS = ${N};`;
  }
  
  this.fragmentShader = this.fragmentShader.replace('@TDUniforms@',example);
  }

  disposeResources() {
    const gl = this.gl;

    // Delete VAO
    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    // Delete shader program and shaders
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.vs) {
      gl.deleteShader(this.vs);
      this.vs = null;
    }
    if (this.fs) {
      gl.deleteShader(this.fs);
      this.fs = null;
    }

    // Delete vertex buffer
    if (this.buffer) {
      gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }

    // Delete output target resources (framebuffer, renderbuffer, texture)
    if (this.output) {
      if (this.output.framebuffer) gl.deleteFramebuffer(this.output.framebuffer);
      if (this.output.renderbuffer) gl.deleteRenderbuffer(this.output.renderbuffer);
      if (this.output.texture) gl.deleteTexture(this.output.texture);
      this.output = null;
    }
    
    // Add instance buffer cleanup
    if (this.instanceBuffer) {
        gl.deleteBuffer(this.instanceBuffer);
        this.instanceBuffer = null;
    }

    // If you have any additional resources, delete them here.
  }

  doInit(){
    // console.log('&&& DO INIT TOP');
    // this.disposeResources();
    this.setResolution();
    this.insertTDUniforms();
    this.compile();
    // console.log(this.name, ' shader:\n',this.fragmentShader);
  }
  
  onResize(){
  }

  resize(){
    for (let j = 0; j< this.inputs.length; j++) {
      this.inputs[j].resize();
    }

    this.setResolution();
    try{
      this.gl.useProgram(this.program);

      //RESOLUTION RELATED UNIFORMS ===============
      if(this.program.uniformsCache && this.program.uniformsCache['resolution']) {
        this.gl.uniform2f(this.program.uniformsCache['resolution'], this.width, this.height);
      }
      let N = this.inputs.length;
      if (N>0){
        for (let i=0; i<N; i++){
          this.gl.uniform4f(this.program.uniformsCache[`uTD2DInfos[${i}].res`],1./this.inputs[i].width, 1./this.inputs[i].height, this.inputs[i].width, this.inputs[i].height);
          this.gl.uniform4f(this.program.uniformsCache[`uTD2DInfos[${i}].depth`],1.,1.,1.,1.);
        }
      }
      this.gl.useProgram(null);
      this.output = this.createTarget(this.width, this.height, this.gl.UNSIGNED_BYTE);
      }
    catch (e) {
      console.error('catched: ',e);
    }

    this.onResize();
  }



  compile(){
    const gl = this.gl;
    
    // Create and bind VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    // Create a buffer for the quad vertices
    const quadVertices = new Float32Array([-1, -1,1, -1,-1, 1,-1, 1,1, -1,1, 1]);

    this.updateSpriteBuffer();

    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    // Create instance data buffer
    this.instanceBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    this.gl.bufferData(gl.ARRAY_BUFFER, this.spriteData, gl.DYNAMIC_DRAW);

    // Create and link program
    this.program = gl.createProgram();
    this.vs = this.createShader(this.vertexShader, this.gl.VERTEX_SHADER);
    this.fs = this.createShader(this.fragmentShader, this.gl.FRAGMENT_SHADER);
    if (this.vs == null || this.fs == null) return null;

    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.deleteShader(this.vs);
    gl.deleteShader(this.fs);
    gl.linkProgram(this.program);
    if ( !gl.getProgramParameter( this.program, this.gl.LINK_STATUS ) ) {
      var error = gl.getProgramInfoLog( this.program );
      console.log(this.name, 'fragmentShader:');
      console.log(this.fragmentShader);
      console.log(this.vertexShader);
      console.error( error );
      console.error( 'VALIDATE_STATUS: ' + this.gl.getProgramParameter( this.program, this.gl.VALIDATE_STATUS ), 'ERROR: ' + this.gl.getError() );
      let err = this.gl.getShaderInfoLog(this.fs);
      err = err.split('ERROR:')[1].split(':')[1];
      console.error(this.name+'  '+this.gl.getShaderInfoLog(this.fs)+'\n'+err+'\n'+this.fragmentShader.split('\n')[err-1]);
      
      return;
    }

    // Set up attributes
    this.gl.useProgram(this.program);
    
    // Position attribute (vertices)
    this.screenVertexPosition = this.gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(this.screenVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(this.screenVertexPosition, 2, gl.FLOAT, false, 0, 0);
    
    // Instance attributes
    const instancePosLoc = gl.getAttribLocation(this.program, "instancePosition");
    const instanceTexCoordsLoc = gl.getAttribLocation(this.program, "instanceTexCoords");
    const instanceColorLoc = gl.getAttribLocation(this.program, "instanceColor");
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    
    // Position attribute (x, y, size)
    gl.enableVertexAttribArray(instancePosLoc);
    gl.vertexAttribPointer(instancePosLoc, 3, gl.FLOAT, false, 40, 0);
    gl.vertexAttribDivisor(instancePosLoc, 1);
    
    // Texture coordinates attribute (startU, startV, endU, endV)
    gl.enableVertexAttribArray(instanceTexCoordsLoc);
    gl.vertexAttribPointer(instanceTexCoordsLoc, 4, gl.FLOAT, false, 40, 12);
    gl.vertexAttribDivisor(instanceTexCoordsLoc, 1);
    
    // Color attribute (r, g, b)
    gl.enableVertexAttribArray(instanceColorLoc);
    gl.vertexAttribPointer(instanceColorLoc, 3, gl.FLOAT, false, 40, 28);
    gl.vertexAttribDivisor(instanceColorLoc, 1);

    //UNIFORMS
    for (var key in this.uniforms){
      this.cacheUniformLocation( this.program, this.uniforms[key]['name']);
    };


    if (this.inputs.length > 0) {
        this.cacheUniformLocation(this.program, 'sTD2DInputs[0]');
    }

     // Load program0 into GPU
    this.gl.useProgram( this.program );
    this.screenVertexPosition = this.gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray( this.screenVertexPosition );


    //UNIFORMS SET VALS
    for (var key in this.uniforms){
      if (this.uniforms[key]['type'] == '1f') this.gl.uniform1f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0] );
      if (this.uniforms[key]['type'] == '2f') this.gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1] );
      if (this.uniforms[key]['type'] == '3f') this.gl.uniform3f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1],this.uniforms[key]['vals'][2] );
      if (this.uniforms[key]['type'] == '4f') this.gl.uniform4f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1] ,this.uniforms[key]['vals'][2] ,this.uniforms[key]['vals'][3] );
      if (this.uniforms[key]['name'] == 'resolution') this.gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.width, this.height );
      if (this.uniforms[key]['name'] == 'res') this.gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.width, this.height );
      
    };

    //OUTPUT
    this.output = this.createTarget( this.width, this.height, gl.UNSIGNED_BYTE );
    // this.output = this.createTarget( this.width, this.height, gl.FLOAT );
    gl.useProgram(null);
    gl.bindVertexArray(null);
  }

  //================== END OF COMPILE ======================

  setUniform1f(name,vals){
    gl.useProgram( this.program );
    this.gl.uniform1f(this.program.uniformsCache[name], vals[0]);
    gl.useProgram(null);
  }

   setUniform2f(name,vals){
    gl.useProgram( this.program );
    this.gl.uniform2f(this.program.uniformsCache[name], vals[0],vals[1]);
    gl.useProgram(null);
  }

   setUniform3f(name,vals){
    gl.useProgram( this.program );
    this.gl.uniform3f(this.program.uniformsCache[name], vals[0],vals[1],vals[2]);
    gl.useProgram(null);
  }

  setUniform4f(name,vals){
    gl.useProgram( this.program );
    this.gl.uniform4f(this.program.uniformsCache[name], vals[0],vals[1],vals[2],vals[3]);
    gl.useProgram(null);
  }


  checkAvatars() {
    const mpOp = this.par.Multiplayerop[0];
    const avaOp = this.par.Avaop[0];

    if (!mpOp || !avaOp || !mpOp.players || !avaOp.loadedImages) return;

    const currentPlayerIds = Object.keys(mpOp.players);
    
    // Check if players changed by comparing with previous state
    const playersChanged = !this._lastPlayerIds || 
        this._lastPlayerIds.length !== currentPlayerIds.length ||
        !this._lastPlayerIds.every(id => currentPlayerIds.includes(id));
    
     if (playersChanged) {
        
        this.sprites = [];
        
        // Create sprites for each player
        for (const playerId in mpOp.players) {
            const player = mpOp.players[playerId];
            const id = player.id; // Default avatar ID if none specified
            const avatarData = avaOp.loadedImages.get(id);
            
            if (avatarData) {
              console.log('avatarData', avatarData);
                const sprite = {
                    id: playerId,
                    x: player.x/1000,
                    y: player.y/1000,
                    size: player.size/1000,
                    startU: avatarData.uvX,
                    startV: avatarData.uvY,
                    endU: avatarData.uvX + avatarData.uvSize,
                    endV: avatarData.uvY + avatarData.uvSize,
                    r: player.r,
                    g: player.g,
                    b: player.b
                };
                this.sprites.push(sprite);
            }
        }
        
        // Update the sprite buffer with new data
        this.updateSpriteBuffer();
        
        // Store current player IDs for next comparison
        this._lastPlayerIds = currentPlayerIds;
    }
  }

  updateDo(){ 
    this.checkAvatars();
    this.render();
  }

  updateSpritePositions() {
    const mpOp = this.par.Multiplayerop[0];
    if (!mpOp || !mpOp.players) return;

    const playerIds = Object.keys(mpOp.players);
    
    for (let i = 0; i < this.numSprites; i++) {
        const playerId = this.sprites[i].id;
        if (!playerId) continue;
        
        const player = mpOp.players[playerId];
        const offset = i * 10;
        
        this.spriteData[offset] = player.x / 1000+0.5;     // x
        this.spriteData[offset + 1] = player.y / 1000+0.5; // y
    }
    
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData, gl.DYNAMIC_DRAW);
  }

  updateSpriteBuffer() {
    const gl = this.gl;
    this.numSprites = this.sprites.length;
    this.spriteData = new Float32Array(this.numSprites * 10);
    
    for (let i = 0; i < this.numSprites; i++) {
        const sprite = this.sprites[i];
        const offset = i * 10;
        
        this.spriteData[offset + 0] = sprite.x;
        this.spriteData[offset + 1] = sprite.y;
        this.spriteData[offset + 2] = sprite.size;
        this.spriteData[offset + 3] = sprite.startU;
        this.spriteData[offset + 4] = sprite.startV;
        this.spriteData[offset + 5] = sprite.endU;
        this.spriteData[offset + 6] = sprite.endV;
        this.spriteData[offset + 7] = sprite.r;
        this.spriteData[offset + 8] = sprite.g;
        this.spriteData[offset + 9] = sprite.b;
    }
    
    if (!this.instanceBuffer) {
        this.instanceBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData, gl.DYNAMIC_DRAW);
  }

  render(){
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);  // Bind VAO before rendering
    this.updateSpritePositions();

    //INPUT UNIFORMS
    gl.useProgram(this.program);
    if (this.inputs.length > 0){
      let samplerIndices = new Int32Array(this.inputs.length);
      for (let i = 0; i < this.inputs.length; i++){
          samplerIndices[i] = i;
          gl.activeTexture( gl.TEXTURE0 + i );
          gl.bindTexture( gl.TEXTURE_2D, this.inputs[i].output.texture );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.uniform1iv(this.program.uniformsCache['sTD2DInputs[0]'], samplerIndices);
    }

    //OUTPUT
    if(!this.toScreen) gl.bindFramebuffer(gl.FRAMEBUFFER, this.output.framebuffer);
    else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Draw instanced sprites
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.numSprites);
    
    gl.bindVertexArray(null);  // Unbind VAO after rendering
    gl.useProgram(null);
  }


  

  //======================= UI ======================

  updateViewerCoord(viewport){

    let rect = this.opUI.texture.getBoundingClientRect();
    this.u0 = rect.left/viewport.width;
    this.u1 = rect.right/viewport.width;
    this.v0 = 1-rect.bottom/viewport.height;
    this.v1 = 1-rect.top/viewport.height;
  }
  createUIbyClass(){

    this.opUI.op.style.backgroundColor =  'rgba(0, 0, 0, 0.1)';

    this.opUI.texture = document.createElement('div');
    this.opUI.texture.classList.add('texture');
    this.opUI.op.appendChild(this.opUI.texture);
    
    this.opUI.name = document.createElement('div');
    this.opUI.name.classList.add('topName');
    this.opUI.op.appendChild(this.opUI.name);
    this.opUI.name.textContent = this.name

    this.opUI.cook = document.createElement('div');
    this.opUI.cook.classList.add('cook');
    this.opUI.op.appendChild(this.opUI.cook);
    this.opUI.cook.textContent = '0000';
  }

  updateUI(){
    this.opUI.cook.textContent = '';//(this.cook).toFixed(4);
    
  }
  

}


//=============================== ConvertedGLSLs_multiplayerCHOP ========================
class ConvertedGLSLs_multiplayerCHOP extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], ['Output']);
    this.OPType = 'keyboardinCHOP';
    this.minInputs = 0;
    this.maxInputs = 0;
    this.par.Posx = 0;
    this.par.Posy = 0;
    this.chans = [40,200,400,10000]; //default current player: size, speed, view, balance 


  }

  updateDo(){ 
    this.processInput(this.par.Posx, this.par.Posy);
    const now = Date.now();
        const timeSinceUpdate = now - this.lastUpdateTime;
        const interpolationFactor = Math.min(timeSinceUpdate / this.serverUpdateRate, 1);
        
        // Draw other players
        for (let id in this.players) {
            if (id === this.socket.id) continue; // Skip local player

            const player = this.players[id];
            const prevPos = this.previousPlayers[id];

            if (prevPos) {
                const dx = player.x - prevPos.x;
                const dy = player.y - prevPos.y;
                const velocityMagnitude = Math.sqrt(dx * dx + dy * dy);
                const velocityThreshold = 0.1;

                let predictedX = player.x;
                let predictedY = player.y;

                if (velocityMagnitude > velocityThreshold) {
                    if (timeSinceUpdate > this.serverUpdateRate) {
                        // Use extrapolation with raw coordinates
                        const maxExtrapolationTime = 200;
                        const extrapolationTime = Math.min(
                            (timeSinceUpdate - this.serverUpdateRate) / this.serverUpdateRate,
                            maxExtrapolationTime / this.serverUpdateRate
                        );
                        predictedX += dx * extrapolationTime;
                        predictedY += dy * extrapolationTime;
                    } else {
                        // Use interpolation with raw coordinates
                        predictedX = prevPos.x + dx * interpolationFactor;
                        predictedY = prevPos.y + dy * interpolationFactor;
                    }
                    //NON INFINITE FIELD FOR NOW
                    predictedX = (predictedX+500)%1000-500;
                    predictedY = (predictedY+500)%1000-500;
                }
            }
        }
        // Update current player position in players object
        if (this.socket && this.socket.id && this.players[this.socket.id]) {
            this.players[this.socket.id].x = this.par.Posx;
            this.players[this.socket.id].y = this.par.Posy;
            const maxSpeed = this.players[this.socket.id].speed;
            const maxSize = this.players[this.socket.id].size;
            const maxViewport = this.players[this.socket.id].viewport_size;
            const balance = this.players[this.socket.id].balance;
            this.chans = [maxSize,maxSpeed,maxViewport,balance];
            
            const speedLimitOp = this.par.Speedlimitop[0];
            speedLimitOp.par.min = -maxSpeed;
            speedLimitOp.par.max = maxSpeed;


            const viewportChop = this.par.Viewportchop[0];
            viewportChop.par.Orthowidth = maxViewport;
            
        }
        // this.chans[0] = Object.keys(this.players).length;

  }


  doInit(){
    this.chans = [40,200,400,10000]; //default current player: size, speed, view, balance 
    if(this.par.Debug==0){
      this.socket = io();
    }
    else{
      // this.socket = io('http://localhost:5001');
      this.socket = io('https://shisha-82b53f8abb75.herokuapp.com/');
    }
        
    // Store the socket ID as a class property
    this.playerID = this.socket.id;
        
    // Initialize game state
    this.players = {};
    this.prizes = {}; //NOT INPLEMENTED YET
    this.localPlayer = { x: 0, y: 0 };
    this.previousPlayers = {};
    this.pendingInputs = [];
    
    // Initialize timing variables
    this.lastUpdateTime = Date.now();
    this.lastServerUpdate = Date.now();
    
    // Initialize input tracking
    this.lastProcessedInput = 0;
    this.inputSequence = 0;

    // Set up socket listener for player updates
    this.socket.on('players_update', (data) => {
        const now = Date.now();
        this.previousPlayers = {...this.players};
        this.players = data;
        this.lastUpdateTime = now;
        this.lastServerUpdate = now;

        // Handle server reconciliation
        while (this.pendingInputs.length > 0 && 
               this.pendingInputs[0].sequence <= this.lastProcessedInput) {
            this.pendingInputs.shift();
        }

        // Re-apply pending inputs
        this.pendingInputs.forEach(input => {
            this.localPlayer.x = input.x;
            this.localPlayer.y = input.y;
        });
    });

    this.socket.on('connect', () => {
      this.playerID = this.socket.id;
      console.log('Connected with ID:', this.playerID);
    });
  }

  processInput(x, y) {
        this.inputSequence++;

        // Use raw coordinates directly
        this.localPlayer.x = x;
        this.localPlayer.y = y;

        // Save input for reconciliation
        this.pendingInputs.push({
            sequence: this.inputSequence,
            x: x,
            y: y
        });

        // Send raw coordinates to server
        this.socket.emit('move', {
            sequence: this.inputSequence,
            x: x,
            y: y
        });
    }


  

  setVals(chans){
  }
}




//=============================== ConvertedGLSLs_viewportCHOP ========================
class ConvertedGLSLs_viewportCHOP extends CHOP{


  constructor(name, time, gl) {
    super(name, time, gl, true, [], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 0;

    this.numChans = 3;
    this.par.Orthowidth = 500;
    this.chans = [1920,1080,500,4];//w, h, rthowidth, scale

  }

  

  updateDo(){
    
    const w = this.gl.drawingBufferWidth;
    const h = this.gl.drawingBufferHeight;
    const maxDim = Math.max(w,h);

    const scale = maxDim/this.par.Orthowidth;

    this.chans[0] = w;
    this.chans[1] = h;
    this.chans[2] = this.par.Orthowidth;
    this.chans[3] = scale;




    
    
    
  }
}












//=============================== ConvertedGLSLs_orthoMove ========================
class ConvertedGLSLs_orthoMove extends CHOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['xy'], ['Output']);
    this.minInputs = 1;
    this.maxInputs = 1;

    this.numChans = 2;
    // this.chans = [0,0];
    // this.prevChans = [-11111,-11111];
    this.prevChans = [0,0];

    //vars


   
  }

  

  updateDo(){
    // this.chans = this.inputs[0].chans.slice();
    // return;
    let modified = -1;
    if(this.inputs[0].chans[0] != this.prevChans[0]) modified = 0;
    if(this.inputs[0].chans[1] != this.prevChans[1]) modified = 1;
    this.prevChans[0] = this.inputs[0].chans[0]*1;
    this.prevChans[1] = this.inputs[0].chans[1]*1;
    
    if(modified == -1)return;
    this.chans = this.inputs[0].chans.slice();
    let x = this.inputs[0].chans[0]*1;
    let y = this.inputs[0].chans[1]*1;

    if (Math.abs(x) > Math.abs(y)) {
        y = 0;
    }
    else {
        if (Math.abs(x) < Math.abs(y)) {
            x = 0;
          }
        else {
            if (modified == 0) {
                y = 0;
            }
            else {
                x = 0;
            }
        }
      }
    
   
    this.chans[0] = x;
    this.chans[1] = y;

    
    
    
  }
}


//=============================== ConvertedGLSLs_multiplayerAvaLoader ========================
class ConvertedGLSLs_multiplayerAvaLoader extends TOP{
  constructor(name, time, gl) {
    super(name, time, gl, true, [], ['Output']);
    this.minInputs = 0;
    this.maxInputs = 0;

    this.OPType = 'avaloaderTOP';
    
    this.par.outputresolution = 9;//custom
    const size = 1000;
    this.par.resolutionw = size;
    this.par.resolutionh = size;
    this.width = size;
    this.height = size;
    this.slotSize = 100;

  


    this.fragmentShader = `#version 300 es
    precision highp float;

    uniform sampler2D textTexture;
    uniform vec2 resolution;

    out vec4 fragColor;

    void main() {
      vec2 uv = gl_FragCoord.xy/resolution.xy;

        fragColor = texture(textTexture, vec2(uv.x, 1.0-uv.y));
        //fragColor.rgb = gl_FragCoord.rgb * fra
        // fragColor = vec4(mod(uv.x*10.,1.),mod(uv.y*10.,1.),0.,1.);
    }`;

    // Append a uniform for the text texture
    this.appendUniform("textTexture", "1i", [0]);
    this.textCanvas = null;
    this.textTexture = null;

    // Add storage for loaded images
    this.loadedImages = new Map(); // stores id -> {x, y, uvX, uvY}
    this.canvasSlots = new Set(); // stores "x,y" strings of occupied slots
  }

  loadImages(url, x,y){
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onerror = (e) => {
      console.error('Error loading image:', e);
    };
    img.onload = () => {
        this.ctx.drawImage(img, x, y, this.slotSize, this.slotSize);
        this.render();
    };
  }

  onCompile(){
    this.textCanvas = document.createElement("canvas");
    this.textCanvas.width = this.width;
    this.textCanvas.height = this.height;
    console.log('ON COMPILE IMG:', this.textCanvas);
    
    this.ctx = this.textCanvas.getContext("2d", { alpha: true });
    this.ctx.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
    this.initTextCanvas();
    this.compile();
    this.loadedIdsImages = [];
    
    // TEST Load initial set of images
    // for (let i = 0; i < 50; i++) {
    //     this.loadImageById(i);
    // }

  }

  loadImageById(id) {
    // If image is already loaded, return its UV coordinates
    if (this.loadedImages.has(id)) {
        return this.loadedImages.get(id);
    }

    const slotSize = this.slotSize;
    const padding = 0;
    const imagesPerRow = Math.floor(this.width / slotSize);
    const maxRows = Math.floor(this.height / slotSize);
    
    let foundSlot = null;
    
    // Start from bottom left (row 0 is bottom)
    for (let row = 0; row < maxRows; row++) {
        for (let col = 0; col < imagesPerRow; col++) {
            const x = col * slotSize;
            // Flip Y coordinate to start from bottom
            const y = this.height - (row + 1) * slotSize;
            const slotKey = `${x},${y}`;
            
            if (!this.canvasSlots.has(slotKey)) {
                foundSlot = { x, y };
                this.canvasSlots.add(slotKey);
                break;
            }
        }
        if (foundSlot) break;
    }

    if (!foundSlot) {
        console.warn('No empty slots available for image:', id);
        return null;
    }

    // Calculate UV coordinates (0-1) from bottom-left corner
    const uvX = foundSlot.x / this.width;
    // Flip Y UV coordinate to match OpenGL coordinate system
    const uvY = (this.height - foundSlot.y - slotSize) / this.height;
    
    // Store the image data
    const imageData = {
        x: foundSlot.x,
        y: foundSlot.y,
        uvX,
        uvY,
        size: slotSize,
        uvSize: slotSize / this.width // normalized size in UV space
    };
    this.loadedImages.set(id, imageData);

    // Load the image with cache-busting query parameter
    const timestamp = new Date().getTime();
    const imageUrl = `https://threerandomwords.s3.us-east-1.amazonaws.com/avatars/${id}.png?nocache=${timestamp}`;
    this.loadImages(imageUrl, foundSlot.x, foundSlot.y);

    return imageData;
  }

  resize(){
    for (let j = 0; j< this.inputs.length; j++) {this.inputs[j].resize();}
  }


  initTextCanvas() {

    this.textTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      this.textCanvas
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  // Render the text texture
  render() {
    this.gl.useProgram(this.program);

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);
      this.gl.texImage2D(
        this.gl.TEXTURE_2D,
        0,
        this.gl.RGBA,
        this.gl.RGBA,
        this.gl.UNSIGNED_BYTE,
        this.textCanvas
      );
    // Bind the text texture
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.textTexture);

    // Set uniforms
    this.gl.uniform1i(this.program.uniformsCache["textTexture"], 0);

    // Set the output target and draw
    if (!this.toScreen) {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.output.framebuffer);
      
    } else {
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, this.width, this.height);
    // Bind buffer and draw
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.vertexAttribPointer(this.screenVertexPosition, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

   updateDo(){ 
    const mpOp = this.par.Multiplayerop[0];
    Object.values(mpOp.players).forEach(player => {
        this.loadImageById(player.id);
    });
    
  }

 
}



//=============================== SPRITES =====================
class ConvertedGLSLs_spritesAva extends OP{
  constructor(name, time, gl) {
    super(name, time, gl, true, ['Source','Mask'], ['Output']);
    this.gl = gl;
    this.family = 'TOP';
    this.par.outputresolution = 10;  //Output Resolution:  0: Use Input  1: Eighth  2: Quarter  3: Half  4: 2X  5: 4X  6: 8X  7: Fit Resolution  8: Limit Resolution  9: Custom Resolution  10: Parent Panel Size
    this.par.resolutionw = 1000;  //Resolution
    this.par.resolutionh = 1000;  //Resolution
    this.width = 1000;
    this.height = 1000;
    this.fixedResInput = 0;
    this.minInputs = 0;
    this.maxInputs = 2;

    // Replace sprite data properties with new structure
    this.sprites = [];
    this.spriteData = null;
    this.vao = null;  // Add VAO property
    this.numSprites = 0;

    this.par.Scale;
    this.par.Posx;
    this.par.Posy;
    this.par.Avascale = 1;
  }

  //WEBGL 2.0
  vertexShader =`#version 300 es
  in vec2 position;
  in vec3 instancePosition; // x, y, size
  in vec4 instanceTexCoords; // startU, startV, endU, endV
  in vec3 instanceColor;    // r, g, b
  
  uniform vec2 resolution;

  out vec2 vUV;
  out vec4 vTexCoords;
  out vec3 vColor;


  void main() {
    float size = instancePosition.z;
    vec2 aspect = vec2(1.,resolution.x/resolution.y);
    vec2 pos = position * size * aspect + instancePosition.xy * 2.0 - 1.0;
    gl_Position = vec4(pos, 0.0, 1.0);
    vUV = position * 0.5 + 0.5;
    vTexCoords = instanceTexCoords;
    vColor = instanceColor;
  }`;
  
  fragmentShader = `#version 300 es
  precision highp float;
  in vec2 vUV;
  in vec4 vTexCoords;
  in vec3 vColor;
  out vec4 fragColor;
  uniform sampler2D sTD2DInputs[2];
  @TDUniforms@
  
void main()
{  
    float dist = length(vUV - vec2(0.5));
    float alpha = smoothstep(0.5, 0.48, dist);
    vec2 texCoord = mix(vTexCoords.xy, vTexCoords.zw, vUV);
    vec4 c = texture(sTD2DInputs[0], texCoord)*texture(sTD2DInputs[1], vUV.st);
    fragColor = vec4(c.rgb, c.a);
}`;

  program;
  uniforms = [];
  output;
  resX;
  resY;
  buffer;
  toScreen = false;

  appendUniform(name, type, vals){
    var c = {'name':name, 'type':type, 'vals': vals};
    this.uniforms.push(c);
  }


  createTarget( width, height, type ) {

    var target = {};
    var gl = this.gl;
    target.framebuffer = gl.createFramebuffer();
    target.renderbuffer = gl.createRenderbuffer();
    target.texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, target.texture );
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, type, null );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindFramebuffer( gl.FRAMEBUFFER, target.framebuffer );
    gl.framebufferTexture2D( gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0 );
    gl.bindTexture( gl.TEXTURE_2D, null );
    gl.bindRenderbuffer( gl.RENDERBUFFER, null );
    gl.bindFramebuffer( gl.FRAMEBUFFER, null);
    return target;

  }

  createShader( src, type ) {
    var shader = this.gl.createShader( type );
    this.gl.shaderSource( shader, src );
    this.gl.compileShader( shader );
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', this.path, this.gl.getShaderInfoLog(shader));
        const shaderSourceLines = src.split("\n");
        shaderSourceLines.forEach((line, index) => {
          console.log(`${index + 1}: ${line}`);
        });
        this.gl.deleteShader(shader);
        return null;
    }
    // console.log(this.name, src);
    return shader;
  }

  cacheUniformLocation(program, label) {
    if (program.uniformsCache === undefined) {
      program.uniformsCache = {};
    }
    program.uniformsCache[label] = this.gl.getUniformLocation(program, label);
  }

  setResolution(){
     // console.log('=====>> RESIZE',this.name)
    if (this.par.outputresolution == 0){ //USE INPUT
      if(this.inputs.length == 0){
        this.width = this.par.resolutionw;
        this.height = this.par.resolutionh;
      }
      else{
        const inOp = this.inputs[this.fixedResInput];
        // console.log('=========>> RES FROM INPUT',inOp.name)
        this.width = inOp.width;
        this.height = inOp.height;
      }
    }
    if (this.par.outputresolution == 9){
      this.width = this.par.resolutionw;
      this.height = this.par.resolutionh;
    }

    if (this.par.outputresolution == 10){
      this.width = this.gl.drawingBufferWidth;
      this.height = this.gl.drawingBufferHeight;
    }

    this.appendUniform('resolution','2f',[this.width,this.height]);
    this.appendUniform('viewportXY','2f',[this.par.Posx,this.par.Posy]);
    this.appendUniform('viewportScale','1f',[this.par.Scale]);
    // console.log('---->SET RESOLUTION:',this.name, this.width, this.height, this.fixedResInput);
    
    let N = this.inputs.length;
    if (N>0){
      for (let i=0; i<N; i++){
        this.appendUniform(`uTD2DInfos[${i}].res`,'4f', [1./this.inputs[i].width, 1./this.inputs[i].height, this.inputs[i].width, this.inputs[i].height]);
        this.appendUniform(`uTD2DInfos[${i}].depth`,'4f',[1.,1.,1.,1.]);
        // console.log(this.name,'TO UNIFORMS->', this.inputs[i].width,this.inputs[i].height);
      }
      // console.log(this.name, 'RES UNIFORM->', this.width,this.height);
    }



  }

  insertTDUniforms(){
    let example = '';
    let texInfoArray = [];
    let N = this.inputs.length;

    if (N>0){
      for (let i=0; i<N; i++){
        texInfoArray.push(`TDTexInfo(vec4(1./${Math.round(this.inputs[i].width)}., 1./${Math.round(this.inputs[i].height)}., ${Math.round(this.inputs[i].width)}., ${Math.round(this.inputs[i].height)}.), vec4(1.))`)
      }
      example = `
  struct TDTexInfo {
    vec4 res;
    vec4 depth;
  };

  uniform TDTexInfo uTD2DInfos[${N}];
  const int TD_NUM_2D_INPUTS = ${N};`;
  }
  
  this.fragmentShader = this.fragmentShader.replace('@TDUniforms@',example);
  }

  disposeResources() {
    const gl = this.gl;

    // Delete VAO
    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    // Delete shader program and shaders
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    if (this.vs) {
      gl.deleteShader(this.vs);
      this.vs = null;
    }
    if (this.fs) {
      gl.deleteShader(this.fs);
      this.fs = null;
    }

    // Delete vertex buffer
    if (this.buffer) {
      gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }

    // Delete output target resources (framebuffer, renderbuffer, texture)
    if (this.output) {
      if (this.output.framebuffer) gl.deleteFramebuffer(this.output.framebuffer);
      if (this.output.renderbuffer) gl.deleteRenderbuffer(this.output.renderbuffer);
      if (this.output.texture) gl.deleteTexture(this.output.texture);
      this.output = null;
    }
    
    // Add instance buffer cleanup
    if (this.instanceBuffer) {
        gl.deleteBuffer(this.instanceBuffer);
        this.instanceBuffer = null;
    }

    // If you have any additional resources, delete them here.
  }

  doInit(){
    // console.log('&&& DO INIT TOP');
    this.disposeResources();
    this.setResolution();
    this.insertTDUniforms();
    this.compile();
    
  }
  onResize(){

  }

  resize(){
    for (let j = 0; j< this.inputs.length; j++) {
      this.inputs[j].resize();
    }

    this.setResolution();
    try{
      this.gl.useProgram(this.program);

      //RESOLUTION RELATED UNIFORMS ===============
      if(this.program.uniformsCache && this.program.uniformsCache['resolution']) {
        this.gl.uniform2f(this.program.uniformsCache['resolution'], this.width, this.height);
      }
      let N = this.inputs.length;
      if (N>0){
        for (let i=0; i<N; i++){
          this.gl.uniform4f(this.program.uniformsCache[`uTD2DInfos[${i}].res`],1./this.inputs[i].width, 1./this.inputs[i].height, this.inputs[i].width, this.inputs[i].height);
          this.gl.uniform4f(this.program.uniformsCache[`uTD2DInfos[${i}].depth`],1.,1.,1.,1.);
        }
      }
      this.gl.useProgram(null);
      this.output = this.createTarget(this.width, this.height, this.gl.UNSIGNED_BYTE);
      }
    catch (e) {
      console.error('catched: ',e);
    }

    this.onResize();
  }


//======================COMPILE ================
  compile(){
    const gl = this.gl;
    
    // Create and bind VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    
    // Create a buffer for the quad vertices
    const quadVertices = new Float32Array([-1, -1,1, -1,-1, 1,-1, 1,1, -1,1, 1]);

    
    this.updateSpriteBuffer();

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    if (!this.instanceBuffer) {
        this.instanceBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData, gl.DYNAMIC_DRAW);



    // Create and link program
    this.program = gl.createProgram();
    this.vs = this.createShader(this.vertexShader, gl.VERTEX_SHADER);
    this.fs = this.createShader(this.fragmentShader, gl.FRAGMENT_SHADER);
    if (this.vs == null || this.fs == null) return null;

    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.deleteShader(this.vs);
    gl.deleteShader(this.fs);
    gl.linkProgram(this.program);
    if ( !gl.getProgramParameter( this.program, gl.LINK_STATUS ) ) {
      var error = gl.getProgramInfoLog( this.program );
      console.log(this.name, 'fragmentShader:');
      console.log(this.fragmentShader);
      console.log(this.vertexShader);
      console.error( error );
      console.error( 'VALIDATE_STATUS: ' + gl.getProgramParameter( this.program, gl.VALIDATE_STATUS ), 'ERROR: ' + gl.getError() );
      let err = gl.getShaderInfoLog(this.fs);
      err = err.split('ERROR:')[1].split(':')[1];
      console.error(this.name+'  '+gl.getShaderInfoLog(this.fs)+'\n'+err+'\n'+this.fragmentShader.split('\n')[err-1]);
      
      return;
    }

    // Set up attributes
    gl.useProgram(this.program);
    
    // Position attribute (vertices)
    this.screenVertexPosition = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(this.screenVertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(this.screenVertexPosition, 2, gl.FLOAT, false, 0, 0);
    
    // Instance attributes
    const instancePosLoc = gl.getAttribLocation(this.program, "instancePosition");
    const instanceTexCoordsLoc = gl.getAttribLocation(this.program, "instanceTexCoords");
    const instanceColorLoc = gl.getAttribLocation(this.program, "instanceColor");
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    
    // Position attribute (x, y, size)
    gl.enableVertexAttribArray(instancePosLoc);
    gl.vertexAttribPointer(instancePosLoc, 3, gl.FLOAT, false, 40, 0);
    gl.vertexAttribDivisor(instancePosLoc, 1);
    
    // Texture coordinates attribute (startU, startV, endU, endV)
    gl.enableVertexAttribArray(instanceTexCoordsLoc);
    gl.vertexAttribPointer(instanceTexCoordsLoc, 4, gl.FLOAT, false, 40, 12);
    gl.vertexAttribDivisor(instanceTexCoordsLoc, 1);
    
    // Color attribute (r, g, b)
    gl.enableVertexAttribArray(instanceColorLoc);
    gl.vertexAttribPointer(instanceColorLoc, 3, gl.FLOAT, false, 40, 28);
    gl.vertexAttribDivisor(instanceColorLoc, 1);

    //UNIFORMS
    for (var key in this.uniforms){
      this.cacheUniformLocation(this.program, this.uniforms[key]['name']);
    };


    if (this.inputs.length > 0) {
        this.cacheUniformLocation(this.program, 'sTD2DInputs[0]');
    }

     // Load program0 into GPU
    gl.useProgram( this.program );
    this.screenVertexPosition = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray( this.screenVertexPosition );


    //UNIFORMS SET VALS
    for (var key in this.uniforms){
      if (this.uniforms[key]['type'] == '1f') gl.uniform1f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0] );
      if (this.uniforms[key]['type'] == '2f') gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1] );
      if (this.uniforms[key]['type'] == '3f') gl.uniform3f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1],this.uniforms[key]['vals'][2] );
      if (this.uniforms[key]['type'] == '4f') gl.uniform4f(this.program.uniformsCache[this.uniforms[key]['name']], this.uniforms[key]['vals'][0],this.uniforms[key]['vals'][1] ,this.uniforms[key]['vals'][2] ,this.uniforms[key]['vals'][3] );
      if (this.uniforms[key]['name'] == 'resolution') gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.width, this.height );
      if (this.uniforms[key]['name'] == 'res') gl.uniform2f(this.program.uniformsCache[this.uniforms[key]['name']], this.width, this.height );
      
    };

    //OUTPUT
    this.output = this.createTarget( this.width, this.height, gl.UNSIGNED_BYTE );
    // this.output = this.createTarget( this.width, this.height, gl.FLOAT );
    gl.useProgram(null);
    gl.bindVertexArray(null);  // Unbind VAO
  }

  //====================END COMPILE ===================

  setUniform1f(name,vals) {
    this.gl.useProgram(this.program);
    this.gl.uniform1f(this.program.uniformsCache[name], vals[0]);
    this.gl.useProgram(null);
  }

   setUniform2f(name,vals){
    this.gl.useProgram( this.program );
    this.gl.uniform2f(this.program.uniformsCache[name], vals[0],vals[1]);
    this.gl.useProgram(null);
  }

   setUniform3f(name,vals){
    this.gl.useProgram( this.program );
    this.gl.uniform3f(this.program.uniformsCache[name], vals[0],vals[1],vals[2]);
    this.gl.useProgram(null);
  }

  setUniform4f(name,vals){
    this.gl.useProgram( this.program );
    this.gl.uniform4f(this.program.uniformsCache[name], vals[0],vals[1],vals[2],vals[3]);
    this.gl.useProgram(null);
  }


  checkAvatars() {
    const mpOp = this.par.Multiplayerop[0];
    const avaOp = this.par.Avaop[0];

    if (!mpOp || !avaOp || !mpOp.players || !avaOp.loadedImages) return;
    const currentPlayerIds = Object.keys(mpOp.players);
    
    const playersChanged = !this._lastPlayerIds || 
        this._lastPlayerIds.length !== currentPlayerIds.length ||
        !this._lastPlayerIds.every(id => currentPlayerIds.includes(id));

    if (playersChanged) {
        this.sprites = [];
        
        for (const playerId in mpOp.players) {
            const player = mpOp.players[playerId];
            const id = player.id; // Default avatar ID if none specified
            const avatarData = avaOp.loadedImages.get(id);
            
            if (avatarData) {
              console.log('avatarData', avatarData);
                const sprite = {
                    id: playerId,
                    x: (player.x-this.par.Posx)/1000,
                    y: (player.y-this.par.Posy)/1000,
                    size: player.size,
                    startU: avatarData.uvX,
                    startV: avatarData.uvY,
                    endU: avatarData.uvX + avatarData.uvSize,
                    endV: avatarData.uvY + avatarData.uvSize,
                    r: 1.0,
                    g: 1.0,
                    b: 1.0
                };
                this.sprites.push(sprite);
            }
        }
        
        this.updateSpriteBuffer();
        this._lastPlayerIds = currentPlayerIds;
    }
  }

  updateDo(){ 
    this.checkAvatars();
    this.render();
  }

  render(){
    var gl = this.gl;
    
    this.updateSpritePositions();
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);  // Bind VAO before rendering

    //INPUT UNIFORMS

    if (this.inputs.length > 0){
      let samplerIndices = new Int32Array(this.inputs.length);
      for (let i = 0; i < this.inputs.length; i++){
          samplerIndices[i] = i;
          gl.activeTexture( gl.TEXTURE0 + i );
          gl.bindTexture( gl.TEXTURE_2D, this.inputs[i].output.texture );
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      gl.uniform1iv(this.program.uniformsCache['sTD2DInputs[0]'], samplerIndices);
    }

    //OUTPUT
    if(!this.toScreen) gl.bindFramebuffer(gl.FRAMEBUFFER, this.output.framebuffer);
    else gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    gl.viewport(0, 0, this.width, this.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.numSprites);
    
    gl.bindVertexArray(null);  // Unbind VAO after rendering
    gl.useProgram(null);
  }


  updateSpritePositions() {
    const orthowidthW = this.width/this.par.Scale;
    const orthowidthH = this.height/this.par.Scale;
    const mpOp = this.par.Multiplayerop[0];
    if (!mpOp || !mpOp.players) return;

    // Get array of player IDs
    const playerIds = Object.keys(mpOp.players);
    
    // Update positions in this.spriteData array
    for (let i = 0; i < this.numSprites; i++) {
        const playerId = this.sprites[i].id;
        if (!playerId) continue;
        
        const player = mpOp.players[playerId];
        const offset = i * 10;
        
        //=============== UPDATE PLAYERS POS:
        this.spriteData[offset + 0] = (player.x - this.par.Posx) / orthowidthW+0.5; 
        this.spriteData[offset + 1] = (player.y - this.par.Posy) / orthowidthH+0.5; 
        this.spriteData[offset + 2] = player.size/this.width*this.par.Scale*this.par.Avascale;
        
    }
    
    // Update the instance buffer
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData, gl.DYNAMIC_DRAW);
  }

  updateSpriteBuffer() {
    const gl = this.gl;
    
    // Calculate total number of sprites
    this.numSprites = this.sprites.length;
    this.spriteData = new Float32Array(this.numSprites * 10);

    for (let i = 0; i < this.numSprites; i++) {
        const sprite = this.sprites[i];
        const offset = i * 10;
        
        this.spriteData[offset + 0] = sprite.x;
        this.spriteData[offset + 1] = sprite.y;
        this.spriteData[offset + 2] = sprite.size*this.par.Avascale;
        this.spriteData[offset + 3] = sprite.startU;
        this.spriteData[offset + 4] = sprite.startV;
        this.spriteData[offset + 5] = sprite.endU;
        this.spriteData[offset + 6] = sprite.endV;
        this.spriteData[offset + 7] = sprite.r;
        this.spriteData[offset + 8] = sprite.g;
        this.spriteData[offset + 9] = sprite.b;
    }
    
    // Update or create the buffer
    if (!this.instanceBuffer) {
        this.instanceBuffer = gl.createBuffer();
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.spriteData, gl.DYNAMIC_DRAW);
  }

//=================== UI ==========================

  updateViewerCoord(viewport){

    let rect = this.opUI.texture.getBoundingClientRect();
    this.u0 = rect.left/viewport.width;
    this.u1 = rect.right/viewport.width;
    this.v0 = 1-rect.bottom/viewport.height;
    this.v1 = 1-rect.top/viewport.height;
  }
  


  //UI
  createUIbyClass(){

    this.opUI.op.style.backgroundColor =  'rgba(0, 0, 0, 0.1)';

    this.opUI.texture = document.createElement('div');
    this.opUI.texture.classList.add('texture');
    this.opUI.op.appendChild(this.opUI.texture);
    
    this.opUI.name = document.createElement('div');
    this.opUI.name.classList.add('topName');
    this.opUI.op.appendChild(this.opUI.name);
    this.opUI.name.textContent = this.name

    this.opUI.cook = document.createElement('div');
    this.opUI.cook.classList.add('cook');
    this.opUI.op.appendChild(this.opUI.cook);
    this.opUI.cook.textContent = '0000';
  }

  updateUI(){
    this.opUI.cook.textContent = '';//(this.cook).toFixed(4);
    
  }
  

}



//----------------------INIT CANVAS AND ON RESIZE ----------------

let play = true;
let gl;
let canvasGl = document.getElementById('canvas');
try {
  // gl = canvasGl.getContext( 'webgl2', { preserveDrawingBuffer: true } );
  gl = canvasGl.getContext( 'webgl2', { preserveDrawingBuffer: true,antialias: false } );
} catch( error ) { }
if ( !gl ) {
  alert("NotSupported");
} else {
  gl.getExtension('OES_standard_derivatives');
  gl.getExtension( 'OES_texture_float' );
  gl.getExtension( 'OES_texture_float_linear' );
}


function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function(...args) {
    const context = this;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  }
}

function onNeedResizeCanvas( event ) {
    var W = window.innerWidth;
    var H = window.innerHeight;
    
    // const dpr = window.devicePixelRatio || 1;
    // W = canvasGl.width * dpr;
    // W = canvasGl.height * dpr;
    // gl.scale(dpr, dpr);
    
    canvasGl.width = W;
    canvasGl.height = H;

    canvasGl.style.width = W + 'px';
    canvasGl.style.height = H + 'px';
    // canvasGl.style.zIndex = "2";
    if (gl) {
      gl.viewport( 0, 0, canvasGl.width, canvasGl.height );
    }
  }

  onNeedResizeCanvas();
//===============================Network ========================
let theTime = new Time();
let OPs = [];

let convertedGLSLs_end = new OutTOP('end',theTime,gl);
let convertedGLSLs_viewport2 = new GlslmultiTOP('viewport2',theTime,gl);
let convertedGLSLs_level1 = new GlslmultiTOP('level1',theTime,gl);
let convertedGLSLs_circles = new ConvertedGLSLs_circles('circles',theTime,gl);
let convertedGLSLs_circle2 = new MoviefileinTOP('circle2',theTime,gl);
let convertedGLSLs = new ContainerCOMP('convertedGLSLs',theTime,gl);
let convertedGLSLs_multiplayerCHOP = new ConvertedGLSLs_multiplayerCHOP('multiplayerCHOP',theTime,gl);
let convertedGLSLs_viewportCHOP = new ConvertedGLSLs_viewportCHOP('viewportCHOP',theTime,gl);
let convertedGLSLs_speedLimit = new LimitCHOP('speedLimit',theTime,gl);
let convertedGLSLs_math1 = new MathCHOP('math1',theTime,gl);
let convertedGLSLs_orthoMove = new ConvertedGLSLs_orthoMove('orthoMove',theTime,gl);
let convertedGLSLs_inputs_out1 = new OutCHOP('out1',theTime,gl);
let convertedGLSLs_inputs_math8 = new MathCHOP('math8',theTime,gl);
let convertedGLSLs_inputs_merge3 = new MergeCHOP('merge3',theTime,gl);
let convertedGLSLs_inputs_math5 = new MathCHOP('math5',theTime,gl);
let convertedGLSLs_inputs_select1 = new SelectCHOP('select1',theTime,gl);
let convertedGLSLs_inputs_null9 = new NullCHOP('null9',theTime,gl);
let convertedGLSLs_inputs_math1 = new MathCHOP('math1',theTime,gl);
let convertedGLSLs_inputs_keyboardin1 = new KeyboardinCHOP('keyboardin1',theTime,gl);
let convertedGLSLs_inputs = new BaseCOMP('inputs',theTime,gl);
let convertedGLSLs_inputs_math6 = new MathCHOP('math6',theTime,gl);
let convertedGLSLs_inputs_select2 = new SelectCHOP('select2',theTime,gl);
let convertedGLSLs_inputs_math7 = new MathCHOP('math7',theTime,gl);
let convertedGLSLs_inputs_limit1 = new LimitCHOP('limit1',theTime,gl);
let convertedGLSLs_inputs_math4 = new MathCHOP('math4',theTime,gl);
let convertedGLSLs_inputs_math3 = new MathCHOP('math3',theTime,gl);
let convertedGLSLs_inputs_hold1 = new HoldCHOP('hold1',theTime,gl);
let convertedGLSLs_inputs_select3 = new SelectCHOP('select3',theTime,gl);
let convertedGLSLs_inputs_mousein2 = new MouseinCHOP('mousein2',theTime,gl);
let convertedGLSLs_inputs_select4 = new SelectCHOP('select4',theTime,gl);
let convertedGLSLs_inputs_merge1 = new MergeCHOP('merge1',theTime,gl);
let convertedGLSLs_playerXY = new NullCHOP('playerXY',theTime,gl);
let convertedGLSLs_speed3 = new SpeedCHOP('speed3',theTime,gl);
let convertedGLSLs_filter2 = new FilterCHOP('filter2',theTime,gl);
let convertedGLSLs_multiplayerAvaLoader = new ConvertedGLSLs_multiplayerAvaLoader('multiplayerAvaLoader',theTime,gl);
let convertedGLSLs_over1 = new GlslmultiTOP('over1',theTime,gl);
let convertedGLSLs_spritesAva = new ConvertedGLSLs_spritesAva('spritesAva',theTime,gl);
let convertedGLSLs_scale = new SelectCHOP('scale',theTime,gl);
let convertedGLSLs_constant4 = new GlslmultiTOP('constant4',theTime,gl);
let convertedGLSLs_null4 = new NullCHOP('null4',theTime,gl);
let convertedGLSLs_math2 = new MathCHOP('math2',theTime,gl);
let convertedGLSLs_merge2 = new MergeCHOP('merge2',theTime,gl);
let convertedGLSLs_null1 = new NullCHOP('null1',theTime,gl);

convertedGLSLs_circles.dependencies.push(convertedGLSLs_multiplayerCHOP);
convertedGLSLs_circles.dependencies.push(convertedGLSLs_multiplayerAvaLoader);
convertedGLSLs_multiplayerCHOP.dependencies.push(convertedGLSLs_viewportCHOP);
convertedGLSLs_multiplayerCHOP.dependencies.push(convertedGLSLs_speedLimit);
convertedGLSLs_multiplayerCHOP.dependencies.push(convertedGLSLs_playerXY);
convertedGLSLs_multiplayerAvaLoader.dependencies.push(convertedGLSLs_multiplayerCHOP);
convertedGLSLs_spritesAva.dependencies.push(convertedGLSLs_multiplayerCHOP);
convertedGLSLs_spritesAva.dependencies.push(convertedGLSLs_multiplayerAvaLoader);
convertedGLSLs_spritesAva.dependencies.push(convertedGLSLs_playerXY);
convertedGLSLs_spritesAva.dependencies.push(convertedGLSLs_scale);
convertedGLSLs_viewport2.dependencies.push(convertedGLSLs_null4);
convertedGLSLs_viewport2.dependencies.push(convertedGLSLs_null1);
convertedGLSLs_speedLimit.numChans = 2;
convertedGLSLs_math1.numChans = 2;
convertedGLSLs_inputs_out1.numChans = 2;
convertedGLSLs_inputs_math8.numChans = 2;
convertedGLSLs_inputs_merge3.numChans = 2;
convertedGLSLs_inputs_math5.numChans = 1;
convertedGLSLs_inputs_select1.numChans = 2;
convertedGLSLs_inputs_null9.numChans = 4;
convertedGLSLs_inputs_math1.numChans = 4;
convertedGLSLs_inputs_keyboardin1.numChans = 4;
convertedGLSLs_inputs_math6.numChans = 1;
convertedGLSLs_inputs_select2.numChans = 2;
convertedGLSLs_inputs_math7.numChans = 2;
convertedGLSLs_inputs_limit1.numChans = 2;
convertedGLSLs_inputs_math4.numChans = 2;
convertedGLSLs_inputs_math3.numChans = 2;
convertedGLSLs_inputs_hold1.numChans = 2;
convertedGLSLs_inputs_select3.numChans = 2;
convertedGLSLs_inputs_mousein2.doChannels = ['posxname','posyname','lbuttonname'];
convertedGLSLs_inputs_mousein2.init();
convertedGLSLs_inputs_mousein2.numChans = 3;
convertedGLSLs_inputs_select4.numChans = 1;
convertedGLSLs_inputs_merge1.numChans = 2;
convertedGLSLs_playerXY.numChans = 2;
convertedGLSLs_speed3.setVals([-51.0369987487793, -134.7220001220703]);
convertedGLSLs_speed3.numChans = 2;
convertedGLSLs_filter2.setVals([-0.0, -0.0]);
convertedGLSLs_filter2.numChans = 2;
convertedGLSLs_scale.numChans = 1;
convertedGLSLs_null4.numChans = 2;
convertedGLSLs_math2.numChans = 2;
convertedGLSLs_merge2.numChans = 2;
convertedGLSLs_null1.numChans = 1;

//-------------------------PARAMTERES--------------
convertedGLSLs_end.par.outputresolution = 0;
convertedGLSLs_end.par.resolutionw = 1000;
convertedGLSLs_end.par.resolutionh = 1000;//end
convertedGLSLs_viewport2.par.outputresolution = 0;
convertedGLSLs_viewport2.par.resolutionw = 1000;
convertedGLSLs_viewport2.par.resolutionh = 1000;//viewport2
convertedGLSLs_viewport2.fixedResInput = 1;
convertedGLSLs_level1.par.outputresolution = 0;
convertedGLSLs_level1.par.resolutionw = 1000;
convertedGLSLs_level1.par.resolutionh = 1000;//level1
convertedGLSLs_circle2.par.outputresolution = 0;
convertedGLSLs_circle2.par.resolutionw = 256;
convertedGLSLs_circle2.par.resolutionh = 256;//circle2
convertedGLSLs_over1.par.outputresolution = 0;
convertedGLSLs_over1.par.resolutionw = 1920;
convertedGLSLs_over1.par.resolutionh = 1080;//over1
convertedGLSLs_over1.fixedResInput = 1;
convertedGLSLs_constant4.par.outputresolution = 10;
convertedGLSLs_constant4.par.resolutionw = 1920;
convertedGLSLs_constant4.par.resolutionh = 1080;//constant4
convertedGLSLs_circles.par.Multiplayerop = [convertedGLSLs_multiplayerCHOP];
convertedGLSLs_circles.par.Avaop = [convertedGLSLs_multiplayerAvaLoader];
convertedGLSLs_circle2.par.file = 'circle2.png';
convertedGLSLs.par.w = 1920.0;
convertedGLSLs.par.h = 1080.0;
convertedGLSLs.par.resizecomp = [convertedGLSLs];
convertedGLSLs.par.repocomp = [convertedGLSLs];
convertedGLSLs_multiplayerCHOP.par.Viewportchop = [convertedGLSLs_viewportCHOP];
convertedGLSLs_multiplayerCHOP.par.Speedlimitop = [convertedGLSLs_speedLimit];
convertedGLSLs_multiplayerCHOP.par.Debug = 1.0;
convertedGLSLs_multiplayerCHOP.par.Debug = 1.0;
convertedGLSLs_viewportCHOP.par.Orthowidth = 337.0;
convertedGLSLs_viewportCHOP.par.Orthowidth = 337.0;
convertedGLSLs_speedLimit.par.type = 1.0;
convertedGLSLs_speedLimit.par.min = -100.0;
convertedGLSLs_speedLimit.par.max = 100.0;
convertedGLSLs_math1.par.gain = -1.0;
convertedGLSLs_inputs_math8.par.chopop = 1.0;
convertedGLSLs_inputs_math5.par.chanop = 2.0;
convertedGLSLs_inputs_select1.par.chans = [0,1];
convertedGLSLs_inputs_math1.par.gain = 500.0;
convertedGLSLs_inputs_keyboardin1.par.keys = 0.0;
convertedGLSLs_inputs_math6.par.chanop = 2.0;
convertedGLSLs_inputs_select2.par.chans = [3,2];
convertedGLSLs_inputs_math7.par.gain = 500.0;
convertedGLSLs_inputs_limit1.par.type = 1.0;
convertedGLSLs_inputs_math4.par.chopop = 3.0;
convertedGLSLs_inputs_math3.par.chopop = 2.0;
convertedGLSLs_inputs_select3.par.chans = [0,1];
convertedGLSLs_inputs_mousein2.par.lbuttonname = 'l';
convertedGLSLs_inputs_select4.par.chans = [2];
convertedGLSLs_speed3.par.limittype = 2.0;
convertedGLSLs_speed3.par.min = -500.0;
convertedGLSLs_speed3.par.max = 500.0;
convertedGLSLs_filter2.par.width = 0.22;
convertedGLSLs_multiplayerAvaLoader.par.Multiplayerop = [convertedGLSLs_multiplayerCHOP];
convertedGLSLs_spritesAva.par.Multiplayerop = [convertedGLSLs_multiplayerCHOP];
convertedGLSLs_spritesAva.par.Avaop = [convertedGLSLs_multiplayerAvaLoader];
convertedGLSLs_spritesAva.par.Avascale = 1.0;
convertedGLSLs_spritesAva.par.Avascale = 1.0;
convertedGLSLs_scale.par.chans = [3];
convertedGLSLs_math2.par.chopop = 3.0;
convertedGLSLs_math2.par.gain = -1.0;

//-------------------------CONNECTIONS--------------
convertedGLSLs_end.connect(convertedGLSLs_viewport2);
convertedGLSLs_viewport2.connect(convertedGLSLs_level1);
convertedGLSLs_viewport2.connect(convertedGLSLs_over1);
convertedGLSLs_level1.connect(convertedGLSLs_circles);
convertedGLSLs_circles.connect(convertedGLSLs_circle2);
convertedGLSLs_speedLimit.connect(convertedGLSLs_math1);
convertedGLSLs_math1.connect(convertedGLSLs_orthoMove);
convertedGLSLs_orthoMove.connect(convertedGLSLs_inputs_out1);
convertedGLSLs_inputs_out1.connect(convertedGLSLs_inputs_math8);
convertedGLSLs_inputs_math8.connect(convertedGLSLs_inputs_merge3);
convertedGLSLs_inputs_math8.connect(convertedGLSLs_inputs_math7);
convertedGLSLs_inputs_merge3.connect(convertedGLSLs_inputs_math5);
convertedGLSLs_inputs_merge3.connect(convertedGLSLs_inputs_math6);
convertedGLSLs_inputs_math5.connect(convertedGLSLs_inputs_select1);
convertedGLSLs_inputs_select1.connect(convertedGLSLs_inputs_null9);
convertedGLSLs_inputs_null9.connect(convertedGLSLs_inputs_math1);
convertedGLSLs_inputs_math1.connect(convertedGLSLs_inputs_keyboardin1);
convertedGLSLs_inputs_math6.connect(convertedGLSLs_inputs_select2);
convertedGLSLs_inputs_select2.connect(convertedGLSLs_inputs_null9);
convertedGLSLs_inputs_math7.connect(convertedGLSLs_inputs_limit1);
convertedGLSLs_inputs_limit1.connect(convertedGLSLs_inputs_math4);
convertedGLSLs_inputs_math4.connect(convertedGLSLs_inputs_math3);
convertedGLSLs_inputs_math4.connect(convertedGLSLs_inputs_merge1);
convertedGLSLs_inputs_math3.connect(convertedGLSLs_inputs_hold1);
convertedGLSLs_inputs_math3.connect(convertedGLSLs_inputs_select3);
convertedGLSLs_inputs_hold1.connect(convertedGLSLs_inputs_select3);
convertedGLSLs_inputs_hold1.connect(convertedGLSLs_inputs_select4);
convertedGLSLs_inputs_select3.connect(convertedGLSLs_inputs_mousein2);
convertedGLSLs_inputs_select4.connect(convertedGLSLs_inputs_mousein2);
convertedGLSLs_inputs_merge1.connect(convertedGLSLs_inputs_select4);
convertedGLSLs_inputs_merge1.connect(convertedGLSLs_inputs_select4);
convertedGLSLs_playerXY.connect(convertedGLSLs_speed3);
convertedGLSLs_speed3.connect(convertedGLSLs_filter2);
convertedGLSLs_filter2.connect(convertedGLSLs_speedLimit);
convertedGLSLs_over1.connect(convertedGLSLs_spritesAva);
convertedGLSLs_over1.connect(convertedGLSLs_constant4);
convertedGLSLs_spritesAva.connect(convertedGLSLs_multiplayerAvaLoader);
convertedGLSLs_spritesAva.connect(convertedGLSLs_circle2);
convertedGLSLs_scale.connect(convertedGLSLs_viewportCHOP);
convertedGLSLs_null4.connect(convertedGLSLs_math2);
convertedGLSLs_math2.connect(convertedGLSLs_speed3);
convertedGLSLs_math2.connect(convertedGLSLs_merge2);
convertedGLSLs_merge2.connect(convertedGLSLs_null1);
convertedGLSLs_merge2.connect(convertedGLSLs_null1);
convertedGLSLs_null1.connect(convertedGLSLs_scale);
convertedGLSLs_end.toScreen = true;

//-------------------------GLSL STUFF--------------
convertedGLSLs_viewport2.fragmentShader = "# version 300 es \nprecision highp float;\nin vec3 vUV;\nuniform sampler2D sTD2DInputs[2];\n@TDUniforms@\nuniform vec2 resolution;\nuniform float psize;\nuniform float pprefit;\nuniform float pjustifyh;\nuniform float pjustifyv;\nuniform float pextend;\nuniform float pr;\nuniform float ptx;\nuniform float pty;\nuniform float ptunit;\nuniform float psx;\nuniform float psy;\nuniform float ppx;\nuniform float ppy;\nuniform float ppunit;\nout vec4 fragColor;\nvec4 operation(vec4 a, vec4 b){\nfloat mask = a.a;\nif(mask>0.) a = a/mask;\nvec4 c = mix(b,a,mask);\nreturn c;\n}\nfloat justifyX(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nif(pjustifyh == 1.) return uv.x-(fixedRes.x-thisRes.x)/fixedRes.x*0.5;\nif(pjustifyh == 2.) return uv.x-(fixedRes.x-thisRes.x)/fixedRes.x;\nreturn uv.x;\n}\nfloat justifyY(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nif(pjustifyv == 1.) return uv.y-(fixedRes.y-thisRes.y)/fixedRes.y*0.5;\nif(pjustifyv == 2.) return uv.y-(fixedRes.y-thisRes.y)/fixedRes.y;\nreturn uv.y;\n}\nvec2 extend(vec2 uv0,vec2 thisRes){\nvec2 uv = uv0;\nif (pextend == 0.) uv = clamp(uv, 0.5/thisRes,1.0-0.5/thisRes);\nif (pextend == 2.) uv = mod(uv, vec2(1.));\nif (pextend == 3.) {\nuv = mod(uv, vec2(2.));\nif (uv.x > 1.) uv.x = 2. - uv.x;\nif (uv.y > 1.) uv.y = 2. - uv.y;\nuv = uv;\n}\nreturn uv;\n}\nvec2 fitHorizontal(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nfloat dY = (fixedRes.y/thisRes.y)*(thisRes.x/fixedRes.x);\nuv.y = uv.y*dY-0.5*dY+0.5;\nreturn uv;\n}\nvec2 fitVertical(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nfloat dX = (fixedRes.x/thisRes.x)*(thisRes.y/fixedRes.y);\nuv.x = uv.x*dX-0.5*dX+0.5;\nreturn uv;\n}\nmat2 getRotMatrix(float _angle){\nreturn mat2(cos(_angle),-sin(_angle),\nsin(_angle),cos(_angle));\n}\nvec2 rotate2(vec2 uv,vec2 fixedRes){\nfloat rad = radians(pr);\nvec2 aspect = fixedRes / fixedRes.y ;\nvec2 newUV = uv;\nnewUV = newUV * aspect;\nnewUV = getRotMatrix(-rad) * newUV;\nnewUV = newUV / aspect;\nreturn newUV;\n}\nvec2 fitResolution(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nvec2 modRes = thisRes;\nif(pprefit == 0.){\nmodRes = fixedRes;\n}\nif(pprefit == 5.) {\nuv.x = justifyX(uv0, thisRes,fixedRes);\nuv.y = justifyY(uv0, thisRes,fixedRes);\nvec2 dRes = fixedRes/thisRes;\nuv = uv*dRes;\n}\nif(pprefit == 1.) uv = fitHorizontal(uv, thisRes, fixedRes);\nif(pprefit == 2.) uv = fitVertical(uv, thisRes, fixedRes);\nif(pprefit == 3.){\nif(thisRes.x/fixedRes.x<thisRes.y/fixedRes.y) uv = fitVertical(uv, thisRes, fixedRes);\nelse uv = fitHorizontal(uv, thisRes, fixedRes);\n}\nif(pprefit == 4.){\nif(thisRes.x/fixedRes.x>thisRes.y/fixedRes.y) uv = fitVertical(uv, thisRes, fixedRes);\nelse uv = fitHorizontal(uv, thisRes, fixedRes);\n}\nvec2 pivot = vec2(ppx,ppy);\nif (ppunit == 0.) pivot = vec2(ppx,ppy)/resolution;\nif (ppunit == 2.) pivot = vec2(ppx,ppy*resolution.x/resolution.y);\nuv = uv-pivot;\nuv = rotate2(uv,modRes);\nuv.x = uv.x/psx;\nuv.y = uv.y/psy;\nuv = uv+pivot;\nuv = extend(uv, thisRes);\nreturn uv;\n}\nvec2 transform(vec2 uv0){\nif(ptunit == 0.)return uv0-vec2(ptx,pty)/resolution;\nif(ptunit == 1.)return uv0-vec2(ptx,pty);\nif(ptunit == 2.)return uv0-vec2(ptx,pty*resolution.x/resolution.y);\nreturn uv0-vec2(ptx,pty);\n}\nvoid main()\n{\nvec2 uv = vUV.st;\nvec2 uv0 = uv;\nvec2 uv1 = uv;\nvec2 res0 = uTD2DInfos[0].res.zw;\nvec2 res1 = uTD2DInfos[1].res.zw;\nif (psize == 1.)uv0 = fitResolution(transform(uv), res0, res1);\nelse uv1 = fitResolution(transform(uv), res1, res0);\nvec4 a = texture(sTD2DInputs[0], uv0);\nvec4 b = texture(sTD2DInputs[1], uv1);\nif(pextend ==1.){\nif (uv0.x<0.||uv0.x>1.||uv0.y<0.||uv0.y>1.) a = vec4(0.);\nif (uv1.x<0.||uv1.x>1.||uv1.y<0.||uv1.y>1.) b = vec4(0.);\n}\nvec4 c = operation(a,b);\nfragColor = (c);\n}\n";
convertedGLSLs_viewport2.appendUniform('psize','1f',[1.0]);
convertedGLSLs_viewport2.appendUniform('pprefit','1f',[5.0]);
convertedGLSLs_viewport2.appendUniform('pjustifyh','1f',[1.0]);
convertedGLSLs_viewport2.appendUniform('pjustifyv','1f',[1.0]);
convertedGLSLs_viewport2.appendUniform('pextend','1f',[2.0]);
convertedGLSLs_viewport2.appendUniform('pr','1f',[0.0]);
convertedGLSLs_viewport2.appendUniform('ptx','1f',[convertedGLSLs_null4.chans[0]*1]);
convertedGLSLs_viewport2.appendUniform('pty','1f',[convertedGLSLs_null4.chans[1]*1]);
convertedGLSLs_viewport2.appendUniform('ptunit','1f',[0.0]);
convertedGLSLs_viewport2.appendUniform('psx','1f',[convertedGLSLs_null1.chans[0]*1]);
convertedGLSLs_viewport2.appendUniform('psy','1f',[convertedGLSLs_null1.chans[0]*1]);
convertedGLSLs_viewport2.appendUniform('ppx','1f',[0.5]);
convertedGLSLs_viewport2.appendUniform('ppy','1f',[0.5]);
convertedGLSLs_viewport2.appendUniform('ppunit','1f',[1.0]);
convertedGLSLs_level1.fragmentShader = "# version 300 es \nprecision highp float;\nin vec3 vUV;\nuniform sampler2D sTD2DInputs[1];\n@TDUniforms@\nuniform vec2 resolution;\nuniform float pclampinput;\nuniform float pinvert;\nuniform float pblacklevel;\nuniform float pbrightness1;\nuniform float pgamma1;\nuniform float pcontrast;\nuniform float popacity;\nuniform float pclamp;\nout vec4 fragColor;\nvoid main()\n{\nvec4 inputT = texture(sTD2DInputs[0], vUV.st);\nvec4 c = inputT;\nif (pclampinput == 1.) c = clamp(c,0.0,1.0);\nc = ((1.0-inputT)*pinvert+inputT*(1.0-pinvert));\nc = (c-pblacklevel)/(1.0-pblacklevel);\nc = c*pbrightness1;\nc = pow(c,vec4(1.0/clamp(pgamma1,0.,5000.)));\nc = pcontrast*(c-0.5)+0.5;\nc.a = inputT.a;\nc = c*popacity;\nfragColor = (c);\n}\n";
convertedGLSLs_level1.appendUniform('pclampinput','1f',[0.0]);
convertedGLSLs_level1.appendUniform('pinvert','1f',[0.0]);
convertedGLSLs_level1.appendUniform('pblacklevel','1f',[0.0]);
convertedGLSLs_level1.appendUniform('pbrightness1','1f',[1.0]);
convertedGLSLs_level1.appendUniform('pgamma1','1f',[1.0]);
convertedGLSLs_level1.appendUniform('pcontrast','1f',[1.0]);
convertedGLSLs_level1.appendUniform('popacity','1f',[0.3970000147819519]);
convertedGLSLs_level1.appendUniform('pclamp','1f',[0.0]);
convertedGLSLs_over1.fragmentShader = "# version 300 es \nprecision highp float;\nin vec3 vUV;\nuniform sampler2D sTD2DInputs[2];\n@TDUniforms@\nuniform vec2 resolution;\nuniform float psize;\nuniform float pprefit;\nuniform float pjustifyh;\nuniform float pjustifyv;\nuniform float pextend;\nuniform float pr;\nuniform float ptx;\nuniform float pty;\nuniform float ptunit;\nuniform float psx;\nuniform float psy;\nuniform float ppx;\nuniform float ppy;\nuniform float ppunit;\nout vec4 fragColor;\nvec4 operation(vec4 a, vec4 b){\nfloat mask = a.a;\nif(mask>0.) a = a/mask;\nvec4 c = mix(b,a,mask);\nreturn c;\n}\nfloat justifyX(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nif(pjustifyh == 1.) return uv.x-(fixedRes.x-thisRes.x)/fixedRes.x*0.5;\nif(pjustifyh == 2.) return uv.x-(fixedRes.x-thisRes.x)/fixedRes.x;\nreturn uv.x;\n}\nfloat justifyY(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nif(pjustifyv == 1.) return uv.y-(fixedRes.y-thisRes.y)/fixedRes.y*0.5;\nif(pjustifyv == 2.) return uv.y-(fixedRes.y-thisRes.y)/fixedRes.y;\nreturn uv.y;\n}\nvec2 extend(vec2 uv0,vec2 thisRes){\nvec2 uv = uv0;\nif (pextend == 0.) uv = clamp(uv, 0.5/thisRes,1.0-0.5/thisRes);\nif (pextend == 2.) uv = mod(uv, vec2(1.));\nif (pextend == 3.) {\nuv = mod(uv, vec2(2.));\nif (uv.x > 1.) uv.x = 2. - uv.x;\nif (uv.y > 1.) uv.y = 2. - uv.y;\nuv = uv;\n}\nreturn uv;\n}\nvec2 fitHorizontal(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nfloat dY = (fixedRes.y/thisRes.y)*(thisRes.x/fixedRes.x);\nuv.y = uv.y*dY-0.5*dY+0.5;\nreturn uv;\n}\nvec2 fitVertical(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nfloat dX = (fixedRes.x/thisRes.x)*(thisRes.y/fixedRes.y);\nuv.x = uv.x*dX-0.5*dX+0.5;\nreturn uv;\n}\nmat2 getRotMatrix(float _angle){\nreturn mat2(cos(_angle),-sin(_angle),\nsin(_angle),cos(_angle));\n}\nvec2 rotate2(vec2 uv,vec2 fixedRes){\nfloat rad = radians(pr);\nvec2 aspect = fixedRes / fixedRes.y ;\nvec2 newUV = uv;\nnewUV = newUV * aspect;\nnewUV = getRotMatrix(-rad) * newUV;\nnewUV = newUV / aspect;\nreturn newUV;\n}\nvec2 fitResolution(vec2 uv0, vec2 thisRes, vec2 fixedRes){\nvec2 uv = uv0;\nvec2 modRes = thisRes;\nif(pprefit == 0.){\nmodRes = fixedRes;\n}\nif(pprefit == 5.) {\nuv.x = justifyX(uv0, thisRes,fixedRes);\nuv.y = justifyY(uv0, thisRes,fixedRes);\nvec2 dRes = fixedRes/thisRes;\nuv = uv*dRes;\n}\nif(pprefit == 1.) uv = fitHorizontal(uv, thisRes, fixedRes);\nif(pprefit == 2.) uv = fitVertical(uv, thisRes, fixedRes);\nif(pprefit == 3.){\nif(thisRes.x/fixedRes.x<thisRes.y/fixedRes.y) uv = fitVertical(uv, thisRes, fixedRes);\nelse uv = fitHorizontal(uv, thisRes, fixedRes);\n}\nif(pprefit == 4.){\nif(thisRes.x/fixedRes.x>thisRes.y/fixedRes.y) uv = fitVertical(uv, thisRes, fixedRes);\nelse uv = fitHorizontal(uv, thisRes, fixedRes);\n}\nvec2 pivot = vec2(ppx,ppy);\nif (ppunit == 0.) pivot = vec2(ppx,ppy)/resolution;\nif (ppunit == 2.) pivot = vec2(ppx,ppy*resolution.x/resolution.y);\nuv = uv-pivot;\nuv = rotate2(uv,modRes);\nuv.x = uv.x/psx;\nuv.y = uv.y/psy;\nuv = uv+pivot;\nuv = extend(uv, thisRes);\nreturn uv;\n}\nvec2 transform(vec2 uv0){\nif(ptunit == 0.)return uv0-vec2(ptx,pty)/resolution;\nif(ptunit == 1.)return uv0-vec2(ptx,pty);\nif(ptunit == 2.)return uv0-vec2(ptx,pty*resolution.x/resolution.y);\nreturn uv0-vec2(ptx,pty);\n}\nvoid main()\n{\nvec2 uv = vUV.st;\nvec2 uv0 = uv;\nvec2 uv1 = uv;\nvec2 res0 = uTD2DInfos[0].res.zw;\nvec2 res1 = uTD2DInfos[1].res.zw;\nif (psize == 1.)uv0 = fitResolution(transform(uv), res0, res1);\nelse uv1 = fitResolution(transform(uv), res1, res0);\nvec4 a = texture(sTD2DInputs[0], uv0);\nvec4 b = texture(sTD2DInputs[1], uv1);\nif(pextend ==1.){\nif (uv0.x<0.||uv0.x>1.||uv0.y<0.||uv0.y>1.) a = vec4(0.);\nif (uv1.x<0.||uv1.x>1.||uv1.y<0.||uv1.y>1.) b = vec4(0.);\n}\nvec4 c = operation(a,b);\nfragColor = (c);\n}\n";
convertedGLSLs_over1.appendUniform('psize','1f',[1.0]);
convertedGLSLs_over1.appendUniform('pprefit','1f',[0.0]);
convertedGLSLs_over1.appendUniform('pjustifyh','1f',[1.0]);
convertedGLSLs_over1.appendUniform('pjustifyv','1f',[1.0]);
convertedGLSLs_over1.appendUniform('pextend','1f',[1.0]);
convertedGLSLs_over1.appendUniform('pr','1f',[0.0]);
convertedGLSLs_over1.appendUniform('ptx','1f',[0.0]);
convertedGLSLs_over1.appendUniform('pty','1f',[0.0]);
convertedGLSLs_over1.appendUniform('ptunit','1f',[1.0]);
convertedGLSLs_over1.appendUniform('psx','1f',[1.0]);
convertedGLSLs_over1.appendUniform('psy','1f',[1.0]);
convertedGLSLs_over1.appendUniform('ppx','1f',[0.5]);
convertedGLSLs_over1.appendUniform('ppy','1f',[0.5]);
convertedGLSLs_over1.appendUniform('ppunit','1f',[1.0]);
convertedGLSLs_constant4.fragmentShader = "# version 300 es \nprecision highp float;\nin vec3 vUV;\n@TDUniforms@\nuniform vec2 resolution;\nuniform float pcolorr;\nuniform float pcolorg;\nuniform float pcolorb;\nuniform float palpha;\nuniform float pcombineinput;\nout vec4 fragColor;\nvec4 combineInput(vec4 c){\nvec4 c1 = vec4(1.);\nif (pcombineinput == 1.){\nc = c1*c;\nreturn c;\n}\nreturn c;\n}\nvoid main()\n{\nvec4 c = vec4(pcolorr,pcolorg,pcolorb,palpha);\nc.rgb = c.rgb*c.a;\nc = combineInput(c);\nfragColor = (c);\n}\n";
convertedGLSLs_constant4.appendUniform('pcolorr','1f',[0.11811800301074982]);
convertedGLSLs_constant4.appendUniform('pcolorg','1f',[0.12350910902023315]);
convertedGLSLs_constant4.appendUniform('pcolorb','1f',[0.14300000667572021]);
convertedGLSLs_constant4.appendUniform('palpha','1f',[1.0]);
convertedGLSLs_constant4.appendUniform('pcombineinput','1f',[1.0]);
convertedGLSLs_end.initialize();
convertedGLSLs_end.update();
//======================UI=======================

//==============================ANIMATION=========================
function animate(){

  theTime.update();
  

  if (play){

convertedGLSLs_multiplayerCHOP.par.Posx = convertedGLSLs_playerXY.chans[0]*1;
convertedGLSLs_multiplayerCHOP.par.Posy = convertedGLSLs_playerXY.chans[1]*1;
convertedGLSLs_multiplayerCHOP.par.Posx = convertedGLSLs_playerXY.chans[0]*1;
convertedGLSLs_multiplayerCHOP.par.Posy = convertedGLSLs_playerXY.chans[1]*1;
convertedGLSLs_spritesAva.par.Posx = convertedGLSLs_playerXY.chans[0]*1;
convertedGLSLs_spritesAva.par.Posy = convertedGLSLs_playerXY.chans[1]*1;
convertedGLSLs_spritesAva.par.Scale = convertedGLSLs_scale.chans[0]*1;
convertedGLSLs_spritesAva.par.Posx = convertedGLSLs_playerXY.chans[0]*1;
convertedGLSLs_spritesAva.par.Posy = convertedGLSLs_playerXY.chans[1]*1;
convertedGLSLs_spritesAva.par.Scale = convertedGLSLs_scale.chans[0]*1;
convertedGLSLs_end.update();
convertedGLSLs_viewport2.setUniform1f('ptx',[convertedGLSLs_null4.chans[0]*1]);
convertedGLSLs_viewport2.setUniform1f('pty',[convertedGLSLs_null4.chans[1]*1]);
convertedGLSLs_viewport2.setUniform1f('psx',[convertedGLSLs_null1.chans[0]*1]);
convertedGLSLs_viewport2.setUniform1f('psy',[convertedGLSLs_null1.chans[0]*1]);
 
}//END PLAY
  //requestAnimationFrame(animate);
}
//requestAnimationFrame(animate);
setInterval(animate, 1000 / 60.0); 
function onResizeWindow( event ) {console.log('RESIZE SHADERS');
onNeedResizeCanvas();
convertedGLSLs_end.resize();

}

  window.addEventListener( 'resize', throttle(onResizeWindow, 100), false );

