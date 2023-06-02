import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MathUtils } from 'three'
import mqtt from 'mqtt'

import indoormap from '../images/map.png'
// 直接在GLTF里加载不能成功，因此选择直接导入
import redcar from '../models/car.gltf'
import truck from '../models/truck.gltf'
import bus from '../models/bus.gltf'
import bicycle from '../models/bicycle.gltf'
import building1 from '../models/building1.gltf'
import building2 from '../models/building2.gltf'
import building3 from '../models/building3.gltf'
import light1 from '../models/light1.gltf'
import station from '../models/station1.gltf'
import stop from '../models/stop.gltf'
import trafficlight from '../models/trafficlight.gltf'
import crossroad from '../models/crossroad.gltf'
import straightroad from '../models/straightroad.gltf'
import Troad from '../models/Troad.gltf'
import sidewalk from '../models/sidewalk.gltf'
import roundroad from '../models/roundroad.gltf'

var car
var arrowHelper
var cameraStatus = 'carView' // 初始摄像头
var receivedData // 服务器数据
var environmentObjects = []
var mapObjects = []


function initMQTT () {
  // mqtt连接设定信息
  const topic = 'hello'
  const WebSocket_URL = 'ws://121.43.37.161:8085/mqtt'
  const options = {
    // 超时时间
    connectTimeout: 4000,

    // 认证信息
    clientId: 'test_react', //可自己定义，最好不要重复
    username: 'zhangyihan', //emq 用户名
    password: '480110', //密码

    // 心跳时间
    keepalive: 60,
    clean: true,
  }
  const client = mqtt.connect(WebSocket_URL, options)

  // 连接成功后初始化mqtt订阅
  client.on('connect', () => {
    console.log('Connected to', WebSocket_URL)

    // 订阅主题
    client.subscribe(topic, (err) => {
      console.log(err || '订阅成功')
    })
  })

  client.onMessageArrived = function (message) {
    // 解析JSON数据
    receivedData = JSON.parse(message.toString().replace(/'/g, '"'))
    console.log(data)

    // 当数据更新时，重新渲染场景
    removeDynamicModelsFromScene()
    loadModels()
    render()
  }
}

// 默认动态物体
const environmentObjectsDefault = [
  {
    id: 1,
    type: 'car',
    location: { x: -80, y: -10 },
    dimensions: { w: 12, l: 10 },
    rotation: 90,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 2,
    type: 'truck',
    location: { x: 60, y: 1.0 },
    dimensions: { w: 15, l: 10 },
    rotation: 90,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 3,
    type: 'truck',
    location: { x: 40, y: 50 },
    dimensions: { w: 15, l: 10 },
    rotation: -90,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000xxxx',
  },
  {
    id: 4,
    type: 'building',
    location: { x: 220, y: 260 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000xxxx',
  },
  {
    id: 5,
    type: 'station',
    location: { x: -180, y: 120 },
    dimensions: { w: 15, l: 10 },
    rotation: 180,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000xxxx',
  },
  {
    id: 6,
    type: 'building2',
    location: { x: -80, y: -180 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000xxxx',
  },
  {
    id: 7,
    type: 'bicycle',
    location: { x: 250, y: -80 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000xxxx',
  },
  {
    id: 8,
    type: 'bus',
    location: { x: 250, y: -10 },
    dimensions: { w: 15, l: 10 },
    rotation: 90,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000xxxx',
  },
]

// 地图物体，只加载一次
const mapObjectsDefault = [
  {
    id: 1,
    type: 'straightroad',
    location: { x: 170, y: 20 },
    dimensions: { w: 12, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.0, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 2,
    type: 'straightroad',
    location: { x: -30, y: 20 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 3,
    type: 'straightroad',
    location: { x: -230, y: 20 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 4,
    type: 'straightroad',
    location: { x: 370, y: 20 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 5,
    type: 'roundroad',
    location: { x: -515, y: -42 },
    dimensions: { w: 15, l: 10 },
    rotation: 90,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 6,
    type: 'crossroad',
    location: { x: 720, y: 20 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 7,
    type: 'sidewalk',
    location: { x: 1090, y: 20 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 8,
    type: 'Troad',
    location: { x: 720, y: 420 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 9,
    type: 'straightroad',
    location: { x: 370, y: 482 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 10,
    type: 'sidewalk',
    location: { x: 170, y: 482 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 11,
    type: 'straightroad',
    location: { x: -20, y: 482 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 12,
    type: 'straightroad',
    location: { x: -220, y: 482 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
  {
    id: 12,
    type: 'straightroad',
    location: { x: -420, y: 482 },
    dimensions: { w: 15, l: 10 },
    rotation: 0,
    is_static: 0,
    update_rate: 4,
    state_vector: { s: 1.0, v: 1.0 },
    current_prediction: { x: 1.5, y: 1.0 },
    camera_source: '000ffff',
  },
]

const carStatus = [
  {
    _id: '630383a0687c069ca0864c40e',
    id: 1,
    x: 10,
    y: 110,
    objID: 1,
    x_obj: 500,
    y_obj: 30,
    Integral_Angle: 90.0,
  },
]

const currentDecision = [
  {
    _id: '630383a0687c069ca0864c40e',
    objID: 1,
    point: 1,
    x: 100,
    y: 10,
  },
]

const pastDecision = [
  {
    _id: '630383a0687c069ca0864c40e',
    point_1: {
      x: -80,
      y: 5,
    },
    point_2: {
      x: 200,
      y: 400,
    },
    point_3: {
      x: 300,
      y: 300,
    },
    point_4: {
      x: -200,
      y: 30,
    },
    point_5: {
      x: 5,
      y: -440,
    },
  },
]

// 类型与加载模型的对应表
const modelMap = {
  truck: truck,
  car: redcar,
  bicycle: bicycle,
  building: building1,
  building2: building2,
  light: light1,
  station: station,
  stop: stop,
  trafficlight: trafficlight,
  bus: bus
}

const streetMap = {
  straightroad: straightroad,
  Troad: Troad,
  crossroad: crossroad,
  sidewalk: sidewalk,
  roundroad: roundroad
}


// 用于加载地形（临时）
function loadMap () {
  var currentMap
  const i = 1
  if (receivedData) {
    receivedData.forEach(obj => {
      if (obj.is_static === true) {
        obj.id = i
        i += 1
        mapObjects.push(obj)
      }
    })
  }
  else {
    mapObjects = mapObjectsDefault
  }

  mapObjects.forEach(obj => {
    let loader = new GLTFLoader()
    loader.load(
      streetMap[obj.type],
      function (gltf) {
        currentMap = gltf.scene
        currentMap.scale.set(20, 20, 20)
        currentMap.position.set(obj.location.x, obj.location.y, 0.01)
        currentMap.rotateX(Math.PI / 2)
        currentMap.rotateY(MathUtils.degToRad(obj.rotation))
        scene.add(currentMap)

        renderer.render(scene, camera)
      })
  })
}

// 根据数据依次初始化其他车
function loadModels () {
  var currentModel
  const i = 1
  if (receivedData) {
    receivedData.forEach(obj => {
      if (obj.is_static === false) {
        obj.id = i
        i += 1
        mapObjects.push(obj)
      }
    })
  }
  else {
    environmentObjects = environmentObjectsDefault
  }

  environmentObjects.forEach(obj => {
    let loader = new GLTFLoader()
    loader.load(
      modelMap[obj.type],
      function (gltf) {
        currentModel = gltf.scene

        //模型大小
        currentModel.scale.set(obj.dimensions.w, 15, obj.dimensions.l)
        //初始位置
        currentModel.position.set(obj.location.x, obj.location.y, 5)
        currentModel.rotateX(Math.PI / 2)
        currentModel.rotateY(MathUtils.degToRad(obj.rotation))
        scene.add(currentModel)

        renderer.render(scene, camera)
      })
  })
}

// 定义删除场景中所有模型的函数，防止多个模型出现
function removeDynamicModelsFromScene () {
  scene.children.forEach((child) => {
    // 判断是否是three.js物体以及是否是动态物体
    if (child.isObject3D && Object.values(modelMap).includes(child)) {
      scene.remove(child)
    }
  })
}

// 场景
const scene = new THREE.Scene()

//相机
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000)
camera.position.set(10, 100, 300)
camera.near = 0.1
camera.far = 10000
camera.updateProjectionMatrix()

//渲染器
const renderer = new THREE.WebGLRenderer({
  antiallias: true, precision: 'highp'
})
//设置渲染区域尺寸

renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

function initHilght () {
  //环境光
  const hilght = new THREE.AmbientLight(0x404040, 5)
  scene.add(hilght)
}

//桌面
function initground () {
  var loader = new THREE.TextureLoader()
  loader.load(indoormap, function (texture) {
    // var geometry = new THREE.PlaneGeometry(1797, 1010)
    var geometry = new THREE.PlaneGeometry(3000, 3000)
    // var material = new THREE.MeshStandardMaterial({ map: texture })
    var material = new THREE.MeshBasicMaterial({ color: 'lightgrey' })
    var mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
  })
}


function initControl () {
  let center = new THREE.Vector3()
  const controls = new OrbitControls(camera, renderer.domElement)
  // 设置控制器的选项
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.enablePan = true
  controls.enableZoom = true
  controls.zoomSpeed = 0.6


  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.DOLLY,
  }


  // 获取相机当前的lookat向量
  const lookat = camera.getWorldDirection(new THREE.Vector3())
  // 将lookat向量转换为相机局部坐标系下的向量
  const localLookat = new THREE.Vector3().copy(lookat).applyQuaternion(camera.quaternion)
  // 监听鼠标事件以在滚动鼠标滚轮时更新中心坐标
  document.addEventListener('wheel', (event) => {
    center.set(event.clientX, event.clientY, 0)
    controls.target.copy(center)
    camera.lookAt(localLookat)
    controls.update()
  })

  const mousewheel = function (event) {
    event.preventDefault()
    var factor = 15
    var mX = (event.clientX / jQuery(THREE_STUFF.container).width()) * 2 - 1
    var mY = -(event.clientY / jQuery(THREE_STUFF.container).height()) * 2 + 1
    var vector = new THREE.Vector3(mX, mY, 0.1)
    vector.unproject(camera)
    vector.sub(camera.position)
    if (event.deltaY < 0) {
      camera.position.addVectors(camera.position, vector.setLength(factor))
      trackBallControls.target.addVectors(trackBallControls.target, vector.setLength(factor))
    } else {
      camera.position.subVectors(camera.position, vector.setLength(factor))
      trackBallControls.target.subVectors(trackBallControls.target, vector.setLength(factor))
    }
  }


  var topViewBtn = document.getElementById('top-view')
  topViewBtn.addEventListener('click', function () {
    // 切换到俯视视角
    camera.position.set(10, 110, 500)
    camera.lookAt(new THREE.Vector3(10, 110, 0))
    controls.target = car.position
    controls.update()
    cameraStatus = 'topView'
  })

  var carViewBtn = document.getElementById('car-view')
  carViewBtn.addEventListener('click', function () {
    // 切换到小车的侧后方视角
    camera.position.set(10, -120, 105)
    camera.lookAt(car.position)
    controls.target = car.position
    controls.update()
    cameraStatus = 'carView'
  })

  //监听控制器的鼠标事件，执行渲染内容
  controls.addEventListener('change', () => {
    renderer.render(scene, camera)
    center = controls.target.clone()
  })
}

function initAxes () {
  // 在屏幕上显示坐标轴
  var axes = new THREE.AxesHelper(1000)
  scene.add(axes)
}

// 加载car模型
function loadCar () {

  //导入3D模型
  let loader = new GLTFLoader()
  loader.load(
    redcar,
    function (gltf) {
      var redCar = gltf.scene

      //模型大小
      redCar.scale.set(14, 14, 14)
      //初始位置
      redCar.position.set(-20, -20, 0)
      redCar.rotateX(Math.PI / 2)
      redCar.rotateY(Math.PI)
      scene.add(redCar)

      renderer.render(scene, camera)
    })
}

function render () {
  var carStatusMqtt = carStatus
  const { data } = receivedData
  const [v] = data
  if (v) {
    carStatusMqtt = v.carStatus
  }


  // 更新箭头位置
  // const startPoint = new THREE.Vector3(carStatus[0].x, carStatus[0].y, 5)
  const startPoint = new THREE.Vector3(-80, -10, 5)
  const endPoint = new THREE.Vector3(carStatus[0].x_obj, carStatus[0].y_obj, 5)
  const dir = endPoint.sub(startPoint).normalize()
  arrowHelper.position.copy(startPoint)
  arrowHelper.setDirection(dir)

  // 更新小车位置
  car.position.set(carStatus[0].x, carStatus[0].y, 2)
  car.rotation.z = THREE.MathUtils.degToRad(carStatus[0].Integral_Angle)

  // 渲染场景
  renderer.render(scene, camera)
  requestAnimationFrame(render)
}

// 遍历数据数组，创建点对象并添加到场景中
currentDecision.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.x
  point.position.y = data.y
  point.position.z = 5
  scene.add(point)
})

// 当前目标点
carStatus.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 'green' })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.x_obj
  point.position.y = data.y_obj
  point.position.z = 5
  scene.add(point)
})

// 过去决策点
pastDecision.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 'blue' })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.point_1.x
  point.position.y = data.point_1.y
  point.position.z = 5
  scene.add(point)
})
pastDecision.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 'blue' })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.point_2.x
  point.position.y = data.point_2.y
  point.position.z = 5
  scene.add(point)
})
pastDecision.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 'blue' })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.point_3.x
  point.position.y = data.point_3.y
  point.position.z = 5
  scene.add(point)
})
pastDecision.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 'blue' })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.point_4.x
  point.position.y = data.point_4.y
  point.position.z = 5
  scene.add(point)
})
pastDecision.forEach((data) => {
  const pointGeometry = new THREE.CircleGeometry(10, 32)
  const pointMaterial = new THREE.MeshBasicMaterial({ color: 'blue' })
  const point = new THREE.Mesh(pointGeometry, pointMaterial)
  point.position.x = data.point_5.x
  point.position.y = data.point_5.y
  point.position.z = 5
  scene.add(point)
})


function initCar () {
  car = Car()
  scene.add(car)
}

function initArrow () {
  // const startPoint = new THREE.Vector3(carStatus[0].x, carStatus[0].y, 5)
  const startPoint = new THREE.Vector3(-80, -10, 5)
  const endPoint = new THREE.Vector3(carStatus[0].x_obj, carStatus[0].y_obj, 5)
  const dir = endPoint.clone().sub(startPoint)
  dir.normalize()
  arrowHelper = new THREE.ArrowHelper(
    dir,
    // 箭头起始点
    startPoint,
    80,
    'green', 10, 10
  )
  scene.add(arrowHelper)
}

function Car () {
  const car = new THREE.Group()

  const backWheel = Wheel()
  backWheel.position.x = -18
  car.add(backWheel)

  const frontWheel = Wheel()
  frontWheel.position.x = 18
  car.add(frontWheel)

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(60, 30, 15),
    new THREE.MeshLambertMaterial({ color: 0xa2523 })
  )
  main.position.z = 12
  car.add(main)

  const carFrontTexture = getCarFrontTexture()
  carFrontTexture.center = new THREE.Vector2(0.5, 0.5)
  carFrontTexture.rotation = Math.PI / 2

  const carBackTexture = getCarFrontTexture()
  carBackTexture.center = new THREE.Vector2(0.5, 0.5)
  carBackTexture.rotation = -Math.PI / 2

  const carRightTexture = getCarSideTexture()

  const carLeftTexture = getCarSideTexture()
  carLeftTexture.flipY = false

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(33, 24, 12), [
    new THREE.MeshLambertMaterial({ map: carFrontTexture }),
    new THREE.MeshLambertMaterial({ map: carBackTexture }),
    new THREE.MeshLambertMaterial({ map: carLeftTexture }),
    new THREE.MeshLambertMaterial({ map: carRightTexture }),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    new THREE.MeshLambertMaterial({ color: 0xffffff })
  ])
  cabin.position.x = -6
  cabin.position.z = 25.5
  car.add(cabin)

  return car
}

function Wheel () {
  const wheel = new THREE.Mesh(
    new THREE.BoxGeometry(12, 33, 12),
    new THREE.MeshLambertMaterial({ color: 0x233333 })
  )
  wheel.position.z = 6
  return wheel
}

function pickRandom (array) {
  return array[Math.floor(Math.random() * array.length)]
}

//car front window
function getCarFrontTexture () {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 32
  const context = canvas.getContext("2d")

  const fillStyle = "#ffffff"
  context.fillRect(0, 0, 64, 32)

  context.fillStyle = "#666666"
  context.fillRect(8, 8, 48, 24)
  return new THREE.CanvasTexture(canvas)
}

//car side window
function getCarSideTexture () {
  const canvas = document.createElement("canvas")
  canvas.width = 128
  canvas.height = 32
  const context = canvas.getContext("2d")

  const fillStyle = "#ffffff"
  context.fillRect(0, 0, 128, 32)

  context.fillStyle = "#666666"
  context.fillRect(10, 8, 38, 24)
  context.fillRect(58, 8, 60, 24)
  return new THREE.CanvasTexture(canvas)
}

function init () {
  initMQTT()
  initground()

  initAxes()

  // initCar()
  // loadCar()
  loadMap()
  loadModels()
  initArrow()

  initHilght()

  initControl()
  render()
}

init()