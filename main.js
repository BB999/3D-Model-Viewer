// Three.jsのインポート
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const viewport = document.getElementById('viewport');
  const fileInput = document.getElementById('fileInput');
  const resetCamera = document.getElementById('resetCamera');
  const modelDetails = document.getElementById('modelDetails');
  const toggleBonesBtn = document.getElementById('toggleBones');
  const toggleMeshBtn = document.getElementById('toggleMesh');
  const toggleGridBtn = document.getElementById('toggleGrid');
  const rotateModelBtn = document.getElementById('rotateModel');
  const switchCameraBtn = document.getElementById('switchCamera');
  const toggleAnimationBtn = document.getElementById('toggleAnimation');
  const animationInput = document.getElementById('animationInput');
  const animationInputLabel = document.getElementById('animationInputLabel');
  const convertToMixamoBtn = document.getElementById('convertToMixamo');
  const exportModelBtn = document.getElementById('exportModel');
  const animationFile = document.getElementById('animationFile');
  const playAnimationBtn = document.getElementById('playAnimation');
  const stopAnimationBtn = document.getElementById('stopAnimation');
  const modelScale = document.getElementById('modelScale');
  const scaleValue = document.getElementById('scaleValue');
  const gravityScale = document.getElementById('gravityScale');

  // HTML要素のデバッグ出力
  console.log('メッシュボタン:', toggleMeshBtn);
  console.log('ボーンボタン:', toggleBonesBtn);
  console.log('グリッドボタン:', toggleGridBtn);
  console.log('アニメーションファイル入力:', animationFile);
  console.log('再生ボタン:', playAnimationBtn);
  console.log('停止ボタン:', stopAnimationBtn);
  console.log('スケールスライダー:', modelScale);
  console.log('重力スライダー:', gravityScale);
  
  // アニメーション関連の変数
  let mixer = null;
  let animations = [];
  let animationAction = null;
  let clock = new THREE.Clock();
  let isAnimating = false;
  let originalModelPosition = new THREE.Vector3();
  
  // VRMモデル用の変数
  let vrmModel = null;
  
  // ファイル名を保存する変数
  let currentModelFileName = '';
  let currentAnimationFileName = '';
  
  // モデルスケール調整
  if (modelScale) {
    modelScale.addEventListener('input', () => {
      // スケール値を更新
      const scale = parseFloat(modelScale.value);
      scaleValue.textContent = scale.toFixed(1);
      
      // モデルのスケールを更新
      if (currentModel) {
        currentModel.scale.set(scale, scale, scale);
        
        // VRMモデルの場合は追加の更新が必要な場合がある
        if (vrmModel) {
          // VRMのアップデート関数があれば呼び出す
          if (typeof vrmModel.update === 'function') {
            vrmModel.update(0);
          }
        }
      }
    });
  }
  
  // メッシュ表示切り替え関数
  const toggleMeshVisibility = () => {
    console.log('メッシュ表示切り替え関数が呼び出されました');
    if (!currentModel) {
      console.log('モデルが読み込まれていません');
      return;
    }
    
    // 表示状態を反転
    meshVisible = !meshVisible;
    console.log(`メッシュ表示状態を ${meshVisible ? 'オン' : 'オフ'} に設定します`);
    
    // メッシュを検索して表示/非表示を切り替える
    let meshCount = 0;
    currentModel.traverse((object) => {
      if (object.isMesh) {
        object.visible = meshVisible;
        meshCount++;
        console.log(`メッシュを${meshVisible ? '表示' : '非表示'}に設定: ${object.name || '名前なし'}`);
      }
    });
    
    console.log(`合計 ${meshCount} 個のメッシュを${meshVisible ? '表示' : '非表示'}に設定しました`);
    
    // レンダリングを強制的に更新
    renderer.render(scene, camera);
  };
  
  // スケールバーと重力バーの表示状態を更新する関数
  const updateScaleControlVisibility = () => {
    if (modelScale) {
      // VRMモデルが表示されている場合
      if (vrmModel) {
        // スケールコントロールを非表示にする
        modelScale.disabled = true;
        scaleValue.style.opacity = '0.5';
        const scaleControl = document.querySelector('.scale-control');
        scaleControl.style.opacity = '0';
        scaleControl.style.visibility = 'hidden';
        
        // VRMモデルのスケールは70に設定（表示はしないがスケールは適用）
        if (currentModel) {
          currentModel.scale.set(70, 70, 70);
        }
        
        // 重力コントロールの表示設定（既存のまま）
        if (gravityScale && vrmModel.springBoneManager) {
          gravityScale.disabled = false;
          const gravityControl = document.querySelector('.gravity-control');
          gravityControl.style.opacity = '1';
          gravityControl.style.visibility = 'visible';
        } else if (gravityScale) {
          gravityScale.disabled = true;
          const gravityControl = document.querySelector('.gravity-control');
          gravityControl.style.opacity = '0';
          gravityControl.style.visibility = 'hidden';
        }
      } else {
        // VRM以外のモデルの場合（既存の処理のまま）
        modelScale.disabled = true;
        scaleValue.style.opacity = '0.5';
        const scaleControl = document.querySelector('.scale-control');
        scaleControl.style.opacity = '0';
        scaleControl.style.visibility = 'hidden';
        
        // 重力コントロールも非表示
        if (gravityScale) {
          gravityScale.disabled = true;
          const gravityControl = document.querySelector('.gravity-control');
          gravityControl.style.opacity = '0';
          gravityControl.style.visibility = 'hidden';
        }
      }
    }
  };
  
  // ボタンのイベントリスナーを直接設定
  if (toggleMeshBtn) {
    // 直接的なイベント設定方法を使用
    toggleMeshBtn.onclick = toggleMeshVisibility;
    console.log('メッシュボタンにonclickイベントを設定しました');
    
    // 初期状態では無効化
    toggleMeshBtn.disabled = true;
    toggleMeshBtn.style.opacity = 0.5;
  } else {
    console.error('メッシュボタン要素が見つかりません');
  }

  // 要素が見つからない場合は処理を中止
  if (!viewport) {
    console.error('viewport要素が見つかりませんでした');
    return;
  }

  // シーン、カメラ、レンダラーの初期化
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);

  const width = viewport.clientWidth || 800;
  const height = viewport.clientHeight || 600;

  // カメラの視野距離を拡大（far値を大きく設定）
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
  // 初期カメラ位置を少し近く設定
  camera.position.set(50, 50, 50);

  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  // VRMのマテリアルと互換性を持たせる設定
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.useLegacyLights = false;
  viewport.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();

  // ライトの追加
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 5, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // カスタム軸付きグリッドを作成する関数
  const createAxisGrid = (size, divisions, gridColor, opacity) => {
    // 既存のグリッドヘルパーを作成
    const gridHelper = new THREE.GridHelper(size, divisions, gridColor, gridColor);
    gridHelper.material.opacity = opacity;
    gridHelper.material.transparent = true;
    
    // X軸を作成（赤）- プラス方向
    const xAxisPlus = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.5, 0),
        new THREE.Vector3(size/2, 0.5, 0)
      ]),
      new THREE.LineBasicMaterial({ 
        color: 0xff0000, 
        linewidth: 2,
        opacity: 0.4,
        transparent: true 
      })
    );
    
    // X軸を作成（赤）- マイナス方向
    const xAxisMinus = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.5, 0),
        new THREE.Vector3(-size/2, 0.5, 0)
      ]),
      new THREE.LineBasicMaterial({ 
        color: 0xff0000, 
        linewidth: 2,
        opacity: 0.4,
        transparent: true
      })
    );
    
    // Z軸を作成（緑）- プラス方向
    const zAxisPlus = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.5, 0),
        new THREE.Vector3(0, 0.5, size/2)
      ]),
      new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: 2,
        opacity: 0.4,
        transparent: true
      })
    );
    
    // Z軸を作成（緑）- マイナス方向
    const zAxisMinus = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.5, 0),
        new THREE.Vector3(0, 0.5, -size/2)
      ]),
      new THREE.LineBasicMaterial({ 
        color: 0x00ff00, 
        linewidth: 2,
        opacity: 0.4,
        transparent: true
      })
    );
    
    // すべての要素をグループにまとめる
    const axisGridGroup = new THREE.Group();
    axisGridGroup.add(gridHelper);
    axisGridGroup.add(xAxisPlus);
    axisGridGroup.add(xAxisMinus);
    axisGridGroup.add(zAxisPlus);
    axisGridGroup.add(zAxisMinus);
    
    return axisGridGroup;
  };

  // グリッドヘルパーの追加（初期サイズをより大きく）
  let grid = createAxisGrid(1000, 100, 0x888888, 0.5);
  grid.visible = true;
  scene.add(grid);

  let currentModel = null;
  let skeletonHelper = null;
  let bonesVisible = false;
  let gridVisible = true; // グリッド表示状態を管理する変数
  let meshVisible = true; // メッシュ表示状態を管理する変数

  // グリッドのサイズを更新する関数
  const updateGrid = (modelSize) => {
    // 古いグリッドを削除
    if (grid) {
      scene.remove(grid);
    }

    // モデルサイズに基づいて適切なグリッドサイズを計算
    // モデルの最大サイズの10倍程度の大きさにする（最小サイズを1000に設定）
    const gridSize = Math.max(1000, Math.ceil(modelSize * 10 / 10) * 10);
    
    // グリッドの分割数（細かさ）の調整
    const gridDivisions = Math.min(100, Math.max(20, Math.floor(gridSize / 20)));
    
    // 新しいグリッドを作成
    grid = createAxisGrid(gridSize, gridDivisions, 0x888888, 0.5);
    grid.visible = true;
    scene.add(grid);
    
    console.log(`グリッドサイズを更新しました: ${gridSize} x ${gridSize}, 分割数: ${gridDivisions}`);
    
    // カメラの視野距離をグリッドサイズに合わせて調整
    camera.far = gridSize * 5;
    camera.updateProjectionMatrix();
    console.log(`カメラの視野距離を更新しました: ${camera.far}`);
  };

  // オブジェクト内のメッシュを再帰的にカウントする関数（改良版）
  const countMeshes = (object) => {
    let count = 0;
    
    // FBXモデルの場合、モデル自体はGroup/Objectであり、その直下またはさらに下の階層にメッシュがある
    if (object.type === 'Object3D' || object.type === 'Group') {
      // このオブジェクト自体はメッシュではないのでカウントしない
      console.log(`グループを検出: ${object.name || 'unnamed group'}`);
    } else if (object.isMesh) {
      // Three.jsのisMeshプロパティを優先して使用
      count++;
      console.log(`メッシュを検出 (isMesh): ${object.name || 'unnamed mesh'}`);
    } else if (object.type === 'Mesh') {
      // typeが'Mesh'の場合
      count++;
      console.log(`メッシュを検出 (type=Mesh): ${object.name || 'unnamed mesh'}`);
    } else if (object.geometry && (object.material || Array.isArray(object.material))) {
      // geometryとmaterialを持つオブジェクト
      count++;
      console.log(`メッシュを検出 (geometry+material): ${object.name || 'unnamed mesh'}`);
    } else {
      console.log(`非メッシュオブジェクト: ${object.type} - ${object.name || 'unnamed'}`);
    }
    
    // 子オブジェクトを再帰的に処理
    if (object.children && object.children.length > 0) {
      console.log(`子オブジェクト数: ${object.children.length} (親: ${object.name || 'unnamed'})`);
      object.children.forEach(child => {
        count += countMeshes(child);
      });
    }
    
    return count;
  };
  
  // オブジェクト内の頂点数を再帰的にカウントする関数
  const countVertices = (object) => {
    let count = 0;
    
    // 現在のオブジェクトがジオメトリを持つかチェック
    if (object.geometry && object.geometry.attributes && 
        object.geometry.attributes.position) {
      count += object.geometry.attributes.position.count;
    }
    
    // 子オブジェクトを再帰的に処理
    if (object.children && object.children.length > 0) {
      object.children.forEach(child => {
        count += countVertices(child);
      });
    }
    
    return count;
  };

  // オブジェクト内のポリゴン数（三角形の数）を再帰的にカウントする関数
  const countPolygons = (object) => {
    let count = 0;
    
    // 現在のオブジェクトがジオメトリを持つかチェック
    if (object.geometry) {
      if (object.geometry.index !== null) {
        // インデックス付きジオメトリの場合
        count += object.geometry.index.count / 3;
      } else if (object.geometry.attributes && object.geometry.attributes.position) {
        // インデックスなしジオメトリの場合、頂点数から三角形数を計算
        // （通常は頂点3つで1つの三角形を形成）
        count += object.geometry.attributes.position.count / 3;
      }
    }
    
    // 子オブジェクトを再帰的に処理
    if (object.children && object.children.length > 0) {
      object.children.forEach(child => {
        count += countPolygons(child);
      });
    }
    
    return Math.floor(count); // 整数に丸める
  };

  // オブジェクト階層を再帰的に出力する関数（デバッグ用）
  const logObjectHierarchy = (object, level = 0) => {
    const indent = ' '.repeat(level * 2);
    let desc = `${indent}${object.name || 'unnamed'} (type: ${object.type})`;
    
    // オブジェクトの詳細情報を追加
    const details = [];
    
    if (object.isMesh) {
      details.push('isMesh=true');
    }
    
    if (object.isGroup) {
      details.push('isGroup=true');
    }
    
    if (object.isObject3D) {
      details.push('isObject3D=true');
    }
    
    if (object.geometry) {
      const vertCount = object.geometry.attributes && object.geometry.attributes.position ? 
                      object.geometry.attributes.position.count : 0;
      details.push(`geometry=${vertCount}頂点`);
    }
    
    if (object.material) {
      if (Array.isArray(object.material)) {
        details.push(`material[${object.material.length}]`);
      } else {
        details.push(`material=${object.material.type || 'unknown'}`);
      }
    }
    
    if (details.length > 0) {
      desc += ` [${details.join(', ')}]`;
    }
    
    console.log(desc);
    
    if (object.children && object.children.length > 0) {
      console.log(`${indent}子オブジェクト数: ${object.children.length}`);
      object.children.forEach(child => {
        logObjectHierarchy(child, level + 1);
      });
    }
  };

  // アニメーションループ
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    
    const delta = clock.getDelta();
    
    // アニメーションミキサーの更新
    if (mixer && isAnimating) {
      mixer.update(delta);
    }
    
    // VRMモデルの更新処理
    if (vrmModel) {
      // VRM 1.0では特別な更新が必要ない場合もある
      if (typeof vrmModel.update === 'function') {
        vrmModel.update(delta);
      }
    }
    
    // グリッドの表示状態を維持（ユーザーが明示的に非表示にした場合を除く）
    if (grid && !grid.visible && gridVisible) {
      grid.visible = true;
    }
    
    renderer.render(scene, camera);
  };
  animate();

  // リサイズハンドラー
  const handleResize = () => {
    const newWidth = viewport.clientWidth;
    const newHeight = viewport.clientHeight;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
  };
  window.addEventListener('resize', handleResize);

  // モデルとそのリソースを解放するヘルパー関数
  const disposeModel = (model) => {
    if (!model) return;
    
    console.log('モデルリソースの解放を開始します...');
    
    // モデル内のすべてのリソースを再帰的に解放
    model.traverse((object) => {
      // ジオメトリを解放
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      // マテリアルを解放
      if (object.material) {
        if (Array.isArray(object.material)) {
          // 複数のマテリアルの場合
          object.material.forEach(material => {
            disposeMaterial(material);
          });
        } else {
          // 単一のマテリアル
          disposeMaterial(object.material);
        }
      }
    });
    
    console.log('モデルリソースの解放が完了しました');
  };

  // マテリアルとそのテクスチャを解放
  const disposeMaterial = (material) => {
    // テクスチャを解放
    for (const key in material) {
      const value = material[key];
      if (value && typeof value === 'object' && value.isTexture) {
        value.dispose();
      }
    }
    
    // マテリアル自体を解放
    material.dispose();
  };

  // FBXモデルのロード関数
  const loadFBXModel = (file) => {
    console.log(`${file.name}の読み込みを開始します...`);
    
    // モデルファイル名を保存
    currentModelFileName = file.name;
    
    // アニメーションが変わるのでファイル名をリセット
    currentAnimationFileName = '';
    
    // VRMモデル変数をリセット
    vrmModel = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      const loader = new FBXLoader();
      loader.load(
        e.target.result,
        (object) => {
          if (currentModel) {
            // モデルのリソースを解放してからシーンから削除
            disposeModel(currentModel);
            scene.remove(currentModel);
            currentModel = null;
          }
          
          // 以前のスケルトンヘルパーがあれば削除
          if (skeletonHelper) {
            scene.remove(skeletonHelper);
            skeletonHelper = null;
          }
          
          // アニメーション関連の変数をリセット
          if (mixer) {
            mixer = null;
            animations = [];
            animationAction = null;
            isAnimating = false;
            
            // ボタンを無効化
            playAnimationBtn.disabled = true;
            stopAnimationBtn.disabled = true;
            
            // クラスを削除
            playAnimationBtn.classList.remove('active');
            stopAnimationBtn.classList.remove('active');
          }
          
          // メッシュ表示状態をリセット（初期状態は表示）
          meshVisible = true;
          
          // アニメーションミキサーの作成
          mixer = new THREE.AnimationMixer(object);
          
          // モデルのスケールを元のサイズに設定
          object.scale.set(1.0, 1.0, 1.0);
          console.log('FBXモデルのスケールを元のサイズに設定しました');
          
          // モデル内の既存アニメーションを探す
          if (object.animations && object.animations.length > 0) {
            console.log(`モデルに ${object.animations.length} 個のアニメーションが含まれています`);
            animations = object.animations;
            
            // モデル内蔵アニメーションがある場合、その情報を表示
            currentAnimationFileName = 'モデル内蔵アニメーション';
            
            // アニメーションボタンを有効化
            playAnimationBtn.disabled = false;
            stopAnimationBtn.disabled = false;
          } else {
            console.log('モデルにアニメーションは含まれていません');
          }
          
          // モデルのバウンディングボックスを計算して中心と大きさを取得
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          // モデル情報を表示
          if (modelDetails) {
            const meshCount = countMeshes(object);
            const vertexCount = countVertices(object);
            const polygonCount = countPolygons(object);
            
            modelDetails.innerHTML = `
              <p>ファイル名: ${file.name}</p>
              <p>モデルサイズ: 
                幅 ${size.x.toFixed(2)}、
                高さ ${size.y.toFixed(2)}、
                奥行き ${size.z.toFixed(2)}
              </p>
              <p>メッシュ数: ${meshCount}</p>
              <p>頂点数: ${vertexCount.toLocaleString()}</p>
              <p>ポリゴン数: ${polygonCount.toLocaleString()}</p>
            `;
          }
          
          // FBXモデルの階層構造をコンソールに出力（デバッグ用）
          console.log('FBXモデルの階層構造:');
          logObjectHierarchy(object);
          console.log('------------------');
          
          // モデルの最大サイズを取得
          const maxModelDimension = Math.max(size.x, size.y, size.z);
          console.log(`FBXモデルの最大サイズ: ${maxModelDimension}`);
          
          // グリッドを更新
          updateGrid(maxModelDimension);
          
          // モデルをY軸方向に少し持ち上げてグリッドの上に配置
          object.position.set(0, size.y / 2 * 0.01, 0);
          
          scene.add(object);
          currentModel = object;
          console.log('現在のモデルを設定しました:', currentModel);
          
          // モデル内のメッシュ数を確認
          let directMeshCount = 0;
          object.traverse((child) => {
            if (child.isMesh || (child.geometry && child.material)) {
              directMeshCount++;
            }
          });
          console.log(`モデル内のメッシュ数: ${directMeshCount}`);

          // モデル内のボーン・スケルトンを探索
          let skeletonsFound = false;
          const findSkeletons = (obj) => {
            if (obj.isSkinnedMesh) {
              console.log(`スキンメッシュを検出: ${obj.name || 'unnamed'}`);
              skeletonsFound = true;
              return true;
            }

            if (obj.isBone) {
              console.log(`ボーンを検出: ${obj.name || 'unnamed'}`);
              skeletonsFound = true;
              return true;
            }
            
            if (obj.children && obj.children.length > 0) {
              for (let child of obj.children) {
                if (findSkeletons(child)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          // モデル内のボーン・スケルトンを探索
          findSkeletons(object);
          
          // スケルトンヘルパーを作成
          skeletonHelper = new THREE.SkeletonHelper(object);
          
          // ボーン表示ボタンの有効化/無効化
          if (toggleBonesBtn) {
            if (skeletonsFound) {
              toggleBonesBtn.disabled = false;
              toggleBonesBtn.style.opacity = 1;
              console.log('ボーン表示ボタンを有効化しました');
              
              // ボーン付きモデルの場合、デフォルトでボーン表示を有効に
              bonesVisible = true;
              skeletonHelper.visible = true;
              console.log('ボーン付きモデルを検出したため、ボーン表示をデフォルトでオンにしました');
            } else {
              toggleBonesBtn.disabled = true;
              toggleBonesBtn.style.opacity = 0.5;
              console.log('このモデルにはボーンがないため、ボーン表示ボタンを無効化しました');
              bonesVisible = false;
              skeletonHelper.visible = false;
            }
          }

          // メッシュ表示ボタンを有効化
          if (toggleMeshBtn) {
            toggleMeshBtn.disabled = false;
            toggleMeshBtn.style.opacity = 1;
            console.log('メッシュ表示ボタンを有効化しました');
          }

          scene.add(skeletonHelper);

          // グリッドを確実に表示
          if (grid) {
            grid.visible = gridVisible;
            console.log(`グリッド表示状態: ${grid.visible ? 'オン' : 'オフ'}`);
          }

          // モデルの中心と大きさを計算し、カメラの位置を調整
          const maxDim = maxModelDimension;
          camera.position.set(
            center.x + maxDim * 0.8,  // 2.0から0.8に変更して近づける
            Math.max(maxDim, size.y) * 0.7,  // 1.5から0.7に変更して近づける
            center.z + maxDim * 0.8   // 2.0から0.8に変更して近づける
          );
          controls.target.copy(center);
          
          // カメラの視野距離を調整（必要以上に小さくしないように最小値を設定）
          camera.near = Math.min(0.1, maxDim * 0.01);
          // カメラの遠方クリップ面はグリッドサイズに基づいて設定（updateGrid内で設定済み）
          camera.updateProjectionMatrix();
          
          // オブジェクト階層をログに出力（デバッグ用）
          console.log('--- モデル階層 ---');
          logObjectHierarchy(object);
          console.log('------------------');

          // FBXモデルの詳細情報を出力
          console.log('--- FBXモデル詳細情報 ---');
          // モデルの種類を特定
          console.log(`モデルタイプ: ${object.type}`);
          // 階層の深さを確認
          let maxDepth = 0;
          const checkDepth = (obj, depth = 0) => {
            maxDepth = Math.max(maxDepth, depth);
            if (obj.children && obj.children.length > 0) {
              obj.children.forEach(child => checkDepth(child, depth + 1));
            }
          };
          checkDepth(object);
          console.log(`階層の最大深さ: ${maxDepth}`);
          
          // 直接の子をチェック
          const directMeshes = object.children.filter(child => child.isMesh).length;
          console.log(`直接の子メッシュ数: ${directMeshes}`);
          const skeletons = object.children.filter(child => child.isSkinnedMesh || child.isBone).length;
          console.log(`スケルトン/ボーン数: ${skeletons}`);
          console.log('---------------------');

          // 再帰的にメッシュ数と頂点数をカウント
          const meshCount = countMeshes(object);
          const vertexCount = countVertices(object);
          const polygonCount = countPolygons(object);
          
          console.log(`検出されたメッシュ数: ${meshCount}`);
          console.log(`検出された頂点数: ${vertexCount}`);
          console.log(`検出されたポリゴン数: ${polygonCount}`);

          // モデル情報の表示（ファイル名を追加）
          updateModelInfo(
            (file.size / 1024 / 1024).toFixed(2) + ' MB',
            meshCount,
            vertexCount,
            polygonCount
          );
          
          // スケールバーの表示状態を更新
          updateScaleControlVisibility();

          console.log(`${file.name}の読み込みが完了しました`);
        },
        // 進行状況のコールバック
        (xhr) => {
          // DataURLを使用している場合はxhr.totalが0になる可能性があるため、進捗表示を簡略化
          if (xhr.total && xhr.total > 0 && isFinite(xhr.loaded / xhr.total)) {
            const percent = (xhr.loaded / xhr.total) * 100;
            console.log(`モデルの読み込み: ${percent.toFixed(2)}%`);
          }
        },
        // エラーコールバック
        (err) => {
          console.error('FBXモデルのロードに失敗しました:', err);
        }
      );
    };
    reader.readAsDataURL(file);
  };

  // モデル情報の更新関数
  const updateModelInfo = (fileSize, meshCount, vertexCount, polygonCount) => {
    if (modelDetails) {
      // ファイルサイズがnumberの場合はMB単位に変換
      const fileSizeText = typeof fileSize === 'number' 
        ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' 
        : fileSize;
      
      modelDetails.innerHTML = `
        <p>ファイル名: ${currentModelFileName}</p>
        <p>ファイルサイズ: ${fileSizeText}</p>
        <p>メッシュ数: ${meshCount}</p>
        <p>頂点数: ${vertexCount}</p>
        <p>ポリゴン数: ${polygonCount}</p>
        ${currentAnimationFileName ? `<p>アニメーション: ${currentAnimationFileName}</p>` : ''}
      `;
      
      // モデルが読み込まれた時点でスケールスライダーを有効化
      if (modelScale) {
        // VRMモデル以外の場合のみスケールを1.0に設定
        if (!vrmModel) {
          modelScale.disabled = false;
          // 初期スケールを1に設定
          modelScale.value = 1;
          scaleValue.textContent = "1.0";
          // モデルのスケールを初期化
          if (currentModel) {
            currentModel.scale.set(1, 1, 1);
          }
        }
      }
    }
  };

  // FBXアニメーションの読み込み関数
  const loadFBXAnimation = (file) => {
    console.log(`アニメーションファイル ${file.name} の読み込みを開始します...`);
    
    // モデルが読み込まれていなければエラー表示
    if (!currentModel || !mixer) {
      alert('先にモデルを読み込んでください');
      return;
    }
    
    // アニメーションファイル名を保存
    currentAnimationFileName = file.name;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const loader = new FBXLoader();
      loader.load(
        e.target.result,
        (animationObject) => {
          console.log('アニメーションを読み込みました:', animationObject);
          
          // アニメーションが含まれているか確認
          if (animationObject.animations && animationObject.animations.length > 0) {
            console.log(`${animationObject.animations.length} 個のアニメーションが見つかりました`);
            
            // 既存のアニメーションをクリア
            animations = [];
            
            // 新しいアニメーションを追加
            animations = animationObject.animations;
            
            // アニメーションをミキサーにセット
            if (animations.length > 0) {
              // 既存のアクションがあれば停止
              if (animationAction) {
                animationAction.stop();
              }
              
              // 最初のアニメーションを使用
              const animation = animations[0];
              console.log(`アニメーション "${animation.name}" を適用します`);
              
              // モデルにアニメーションを適用
              animationAction = mixer.clipAction(animation);
              animationAction.setLoop(THREE.LoopRepeat);
              animationAction.clampWhenFinished = false;
              
              // ボタンを有効化
              playAnimationBtn.disabled = false;
              stopAnimationBtn.disabled = false;
              
              // モデル情報パネルを更新（アニメーション名を含める）
              if (currentModel) {
                const box = new THREE.Box3().setFromObject(currentModel);
                const size = box.getSize(new THREE.Vector3());
                const meshCount = countMeshes(currentModel);
                const vertexCount = countVertices(currentModel);
                const polygonCount = countPolygons(currentModel);
                
                // ファイルサイズは元のモデルのものを使用
                const fileInput = document.getElementById('fileInput');
                const fileSize = fileInput.files[0] ? fileInput.files[0].size : 0;
                
                updateModelInfo(fileSize, meshCount, vertexCount, polygonCount);
              }
              
              console.log('アニメーションの準備が完了しました');
              
              // 自動的に再生開始
              playAnimation();
            }
          } else {
            console.warn('アニメーションファイルにアニメーションが含まれていません');
            alert('アニメーションが見つかりませんでした');
            
            // アニメーションが見つからなかった場合、ファイル名をクリア
            currentAnimationFileName = '';
            
            // モデル情報を更新
            if (currentModel) {
              const fileInput = document.getElementById('fileInput');
              const fileSize = fileInput.files[0] ? fileInput.files[0].size : 0;
              const meshCount = countMeshes(currentModel);
              const vertexCount = countVertices(currentModel);
              const polygonCount = countPolygons(currentModel);
              updateModelInfo(fileSize, meshCount, vertexCount, polygonCount);
            }
          }
        },
        // 進行状況のコールバック
        (xhr) => {
          if (xhr.total && xhr.total > 0) {
            const percent = (xhr.loaded / xhr.total) * 100;
            console.log(`アニメーション読み込み: ${percent.toFixed(2)}%`);
          }
        },
        // エラーコールバック
        (err) => {
          console.error('アニメーションのロードに失敗しました:', err);
          alert('アニメーションの読み込みに失敗しました');
        }
      );
    };
    reader.readAsDataURL(file);
  };
  
  // アニメーション再生関数
  const playAnimation = () => {
    if (!mixer || !animationAction) {
      console.warn('再生可能なアニメーションがありません');
      return;
    }
    
    // アニメーションを再生
    animationAction.reset();
    animationAction.play();
    isAnimating = true;
    
    // ボタンの見た目を更新
    playAnimationBtn.classList.add('active');
    stopAnimationBtn.classList.remove('active');
    
    console.log('アニメーションを再生しています');
  };
  
  // アニメーション停止関数
  const stopAnimation = () => {
    if (!mixer || !animationAction) {
      return;
    }
    
    // アニメーションを停止
    animationAction.stop();
    isAnimating = false;
    
    // ボタンの見た目を更新
    playAnimationBtn.classList.remove('active');
    stopAnimationBtn.classList.add('active');
    
    console.log('アニメーションを停止しました');
  };

  // GLBモデルのロード関数
  const loadGLBModel = (file) => {
    console.log(`${file.name}の読み込みを開始します...`);
    
    // モデルファイル名を保存
    currentModelFileName = file.name;
    
    // アニメーションが変わるのでファイル名をリセット
    currentAnimationFileName = '';
    
    // VRMモデル変数をリセット
    vrmModel = null;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const loader = new GLTFLoader();
      loader.load(
        e.target.result,
        (gltf) => {
          if (currentModel) {
            // モデルのリソースを解放してからシーンから削除
            disposeModel(currentModel);
            scene.remove(currentModel);
            currentModel = null;
          }
          
          // 以前のスケルトンヘルパーがあれば削除
          if (skeletonHelper) {
            scene.remove(skeletonHelper);
            skeletonHelper = null;
          }

          // メッシュ表示状態をリセット（初期状態は表示）
          meshVisible = true;
          
          // モデルの位置を調整（グリッドの上に配置）
          const object = gltf.scene;
          
          // モデルのスケールを元のサイズに設定
          object.scale.set(1.0, 1.0, 1.0);
          console.log('GLBモデルのスケールを元のサイズに設定しました');
          
          // モデルのバウンディングボックスを計算して中心と大きさを取得
          const box = new THREE.Box3().setFromObject(object);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          console.log(`GLBモデルのサイズ: X=${size.x}, Y=${size.y}, Z=${size.z}`);
          console.log(`GLBモデルの中心: X=${center.x}, Y=${center.y}, Z=${center.z}`);
          
          // モデルの最大サイズを取得
          const maxModelDimension = Math.max(size.x, size.y, size.z);
          console.log(`GLBモデルの最大サイズ: ${maxModelDimension}`);
          
          // グリッドを更新（FBXと同じロジックを適用）
          updateGrid(maxModelDimension);
          
          // モデルをY軸方向に少し持ち上げてグリッドの上に配置
          object.position.set(0, size.y / 2 * 0.01, 0);
          
          scene.add(object);
          currentModel = object;

          // モデル内のボーン・スケルトンを探索
          let skeletonsFound = false;
          const findSkeletons = (obj) => {
            if (obj.isSkinnedMesh) {
              console.log(`スキンメッシュを検出: ${obj.name || 'unnamed'}`);
              skeletonsFound = true;
              return true;
            }

            if (obj.isBone) {
              console.log(`ボーンを検出: ${obj.name || 'unnamed'}`);
              skeletonsFound = true;
              return true;
            }
            
            if (obj.children && obj.children.length > 0) {
              for (let child of obj.children) {
                if (findSkeletons(child)) {
                  return true;
                }
              }
            }
            
            return false;
          };
          
          // モデル内のボーン・スケルトンを探索
          findSkeletons(object);
          
          // スケルトンヘルパーを作成
          skeletonHelper = new THREE.SkeletonHelper(object);
          
          // ボーン表示ボタンの有効化/無効化
          if (toggleBonesBtn) {
            if (skeletonsFound) {
              toggleBonesBtn.disabled = false;
              toggleBonesBtn.style.opacity = 1;
              console.log('ボーン表示ボタンを有効化しました');
            } else {
              toggleBonesBtn.disabled = true;
              toggleBonesBtn.style.opacity = 0.5;
              console.log('このモデルにはボーンがないため、ボーン表示ボタンを無効化しました');
            }
          }

          // メッシュ表示ボタンを有効化
          if (toggleMeshBtn) {
            toggleMeshBtn.disabled = false;
            toggleMeshBtn.style.opacity = 1;
            console.log('メッシュ表示ボタンを有効化しました');
          }

          scene.add(skeletonHelper);

          // グリッドを確実に表示
          if (grid) {
            grid.visible = gridVisible;
            console.log(`グリッド表示状態: ${gridVisible ? 'オン' : 'オフ'}`);
          }

          // モデルの中心と大きさを計算し、カメラの位置を調整
          const maxDim = maxModelDimension;
          camera.position.set(
            center.x + maxDim * 0.8,  // 2.0から0.8に変更して近づける
            Math.max(maxDim, size.y) * 0.7,  // 1.5から0.7に変更して近づける
            center.z + maxDim * 0.8   // 2.0から0.8に変更して近づける
          );
          controls.target.copy(center);
          
          // カメラの視野距離を調整（必要以上に小さくしないように最小値を設定）
          camera.near = Math.min(0.1, maxDim * 0.01);
          // カメラの遠方クリップ面はグリッドサイズに基づいて設定（updateGrid内で設定済み）
          camera.updateProjectionMatrix();
          
          // オブジェクト階層をログに出力（デバッグ用）
          console.log('--- モデル階層 ---');
          logObjectHierarchy(object);
          console.log('------------------');

          // GLBモデルの詳細情報を出力
          console.log('--- GLBモデル詳細情報 ---');
          // モデルの種類を特定
          console.log(`モデルタイプ: ${object.type}`);
          // 階層の深さを確認
          let maxDepth = 0;
          const checkDepth = (obj, depth = 0) => {
            maxDepth = Math.max(maxDepth, depth);
            if (obj.children && obj.children.length > 0) {
              obj.children.forEach(child => checkDepth(child, depth + 1));
            }
          };
          checkDepth(object);
          console.log(`階層の最大深さ: ${maxDepth}`);
          
          // 直接の子をチェック
          const directMeshes = object.children.filter(child => child.isMesh).length;
          console.log(`直接の子メッシュ数: ${directMeshes}`);
          const skeletons = object.children.filter(child => child.isSkinnedMesh || child.isBone).length;
          console.log(`スケルトン/ボーン数: ${skeletons}`);
          console.log('---------------------');

          // 再帰的にメッシュ数と頂点数をカウント
          const meshCount = countMeshes(object);
          const vertexCount = countVertices(object);
          const polygonCount = countPolygons(object);
          
          console.log(`検出されたメッシュ数: ${meshCount}`);
          console.log(`検出された頂点数: ${vertexCount}`);
          console.log(`検出されたポリゴン数: ${polygonCount}`);

          // モデル情報の表示（ファイル名を追加）
          updateModelInfo(
            (file.size / 1024 / 1024).toFixed(2) + ' MB',
            meshCount,
            vertexCount,
            polygonCount
          );
          
          // スケールバーの表示状態を更新
          updateScaleControlVisibility();

          console.log(`${file.name}の読み込みが完了しました`);
        },
        // 進行状況のコールバック
        (xhr) => {
          // DataURLを使用している場合はxhr.totalが0になる可能性があるため、進捗表示を簡略化
          if (xhr.total && xhr.total > 0 && isFinite(xhr.loaded / xhr.total)) {
            const percent = (xhr.loaded / xhr.total) * 100;
            console.log(`モデルの読み込み: ${percent.toFixed(2)}%`);
          }
        },
        // エラーコールバック
        (err) => {
          console.error('GLBモデルのロードに失敗しました:', err);
        }
      );
    };
    reader.readAsDataURL(file);
  };

  // VRMモデルを読み込む関数
  const loadVRMModel = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target.result;
      
      // 現在のモデル情報をリセット
      currentModelFileName = file.name;
      stopAnimation();
      
      // すでにモデルがあれば削除
      if (currentModel) {
        // モデルのリソースを解放してからシーンから削除
        disposeModel(currentModel);
        scene.remove(currentModel);
        currentModel = null;
      }
      
      // スケルトンヘルパーがあれば削除
      if (skeletonHelper) {
        scene.remove(skeletonHelper);
        skeletonHelper = null;
      }
      
      // VRMモデルのリセット
      vrmModel = null;
      
      // ローディング情報を表示
      updateModelInfo(
        (file.size / 1024 / 1024).toFixed(2) + ' MB',
        '読み込み中...',
        '読み込み中...',
        '読み込み中...'
      );
      
      // GLTFLoaderを使用してVRMを読み込む
      const loader = new GLTFLoader();
      
      // VRMLoaderPluginを登録
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
      
      // バッファーから読み込み
      loader.parse(arrayBuffer, '', (gltf) => {
        // VRMインスタンスを取得
        const vrm = gltf.userData.vrm;
        
        if (!vrm) {
          console.error('VRMモデルとして読み込むことができませんでした');
          return;
        }
        
        // グローバル変数に保存
        vrmModel = vrm;
        
        // モデルを設定
        currentModel = vrm.scene;
        
        // マテリアルの設定（VRMのマテリアルを調整）
        currentModel.traverse((object) => {
          if (object.material) {
            // マテリアルがある場合は設定を調整
            if (Array.isArray(object.material)) {
              object.material.forEach(material => {
                material.transparent = true;
                material.depthWrite = true;
                material.side = THREE.DoubleSide;
              });
            } else {
              object.material.transparent = true;
              object.material.depthWrite = true;
              object.material.side = THREE.DoubleSide;
            }
          }
        });
        
        // まずシーンにモデルを追加
        scene.add(currentModel);
        
        // モデルのバウンディングボックスを計算
        const bbox = new THREE.Box3().setFromObject(currentModel);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // モデルの中心を計算
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        
        // モデルの向きを調整（正面がカメラを向くように）
        // 異なるVRMモデルは異なる座標系を持つ可能性があるため、
        // 必要に応じて別の方向を試してください
        if (file.name.toLowerCase().includes('_flipped') || file.name.toLowerCase().includes('_reverse')) {
          // ファイル名に_flippedや_reverseが含まれる場合は別の回転を適用
          currentModel.rotation.set(0, Math.PI, 0); // Y軸回りに180度回転
        } else {
          // 通常のケース
          currentModel.rotation.set(0, 0, 0); // 回転なし - 正面を向くように設定
        }
        
        // モデルの位置を原点調整
        currentModel.position.x = -center.x;
        currentModel.position.y = -center.y;
        currentModel.position.z = -center.z;
        
        // 元のモデル位置を保存（必ず位置設定後に保存）
        originalModelPosition.copy(currentModel.position);
        console.log('VRMモデルの元の位置を保存:', originalModelPosition);
        
        // カメラをVRMモデルの大きさに合わせて調整（スケール70を考慮）
        const vrmScale = 70; // VRMモデルのスケール
        const scaledMaxDim = maxDim * vrmScale;
        
        // スケールを考慮した適切な距離にカメラを配置
        // 斜めから撮影するようにカメラを配置（X軸とZ軸の両方に値を設定）
        const cameraDistance = scaledMaxDim * 0.9; // カメラの距離
        
        // カメラの角度（ラジアン）- 45度を斜め角度として使用
        const cameraAngle = Math.PI / 4; // 45度
        
        // ファイル名に応じて左右のカメラアングルを選択
        if (file.name.toLowerCase().includes('_left')) {
          // 左斜め前からのアングル
          camera.position.set(
            -cameraDistance * Math.sin(cameraAngle), // 左側（X軸マイナス方向）
            scaledMaxDim * 0.6,                     // 高さをより高く設定
            -cameraDistance * Math.cos(cameraAngle)  // 正面（Z軸マイナス方向）
          );
        } else {
          // デフォルト: 右斜め前からのアングル
          camera.position.set(
            cameraDistance * Math.sin(cameraAngle),  // 右側（X軸プラス方向）
            scaledMaxDim * 0.6,                     // 高さをより高く設定
            -cameraDistance * Math.cos(cameraAngle)  // 正面（Z軸マイナス方向）
          );
        }
        
        // モデルの中心付近を見るようにカメラの視点を設定
        const targetHeight = scaledMaxDim * 0.4; // モデルの中央より上を見る
        camera.lookAt(0, targetHeight, 0);
        controls.target.set(0, targetHeight, 0);
        
        // カメラの近接面と遠方面を調整
        camera.near = Math.max(0.1, scaledMaxDim * 0.01);
        camera.far = scaledMaxDim * 10;
        camera.updateProjectionMatrix();
        
        // OrbitControlsを更新
        controls.update();
        
        // グリッドを更新（スケールを考慮）
        updateGrid(scaledMaxDim);
        
        // モデルの情報を表示
        let meshCount = 0;
        let vertexCount = 0;
        let polygonCount = 0;
        
        // メッシュ、頂点、ポリゴン数を計算
        currentModel.traverse((object) => {
          if (object.isMesh) {
            meshCount++;
            if (object.geometry) {
              if (object.geometry.attributes.position) {
                vertexCount += object.geometry.attributes.position.count;
              }
              if (object.geometry.index) {
                polygonCount += object.geometry.index.count / 3;
              } else if (object.geometry.attributes.position) {
                polygonCount += object.geometry.attributes.position.count / 3;
              }
            }
          }
        });
        
        // モデル情報を更新
        updateModelInfo(
          (file.size / 1024 / 1024).toFixed(2) + ' MB',
          meshCount.toString(),
          vertexCount.toString(),
          Math.floor(polygonCount).toString()
        );
        
        // スケールバーの表示状態を更新
        updateScaleControlVisibility();
        
        // UIボタンを有効化
        toggleBonesBtn.disabled = false;
        toggleBonesBtn.style.opacity = 1;
        toggleMeshBtn.disabled = false;
        toggleMeshBtn.style.opacity = 1;
        
        // アニメーションボタンを有効化（FBXはアニメーションをサポート）
        playAnimationBtn.disabled = false;
        stopAnimationBtn.disabled = false;
        
        // ログ出力
        console.log('VRMモデルの読み込みが完了しました', vrm);
      }, (error) => {
        console.error('VRMモデルの読み込み中にエラーが発生しました', error);
      });
    };
    
    reader.readAsArrayBuffer(file);
  };

  // ファイル選択時の処理
  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();

    if (extension === 'fbx') {
      loadFBXModel(file);
    } else if (extension === 'glb') {
      loadGLBModel(file);
    } else if (extension === 'vrm') {
      loadVRMModel(file);
    } else {
      alert('サポートされていないファイル形式です。.fbx, .glb または .vrm ファイルを選択してください。');
    }
  });
  
  // アニメーションファイル選択イベント
  if (animationFile) {
    animationFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const fileExtension = file.name.toLowerCase().split('.').pop();
        if (fileExtension === 'fbx') {
          loadFBXAnimation(file);
        } else {
          alert('FBXアニメーションファイルを選択してください');
        }
      }
    });
  }
  
  // 再生ボタンのイベントリスナー
  if (playAnimationBtn) {
    playAnimationBtn.addEventListener('click', playAnimation);
  }
  
  // 停止ボタンのイベントリスナー
  if (stopAnimationBtn) {
    stopAnimationBtn.addEventListener('click', stopAnimation);
  }

  // ボーン表示ボタン
  if (toggleBonesBtn) {
    toggleBonesBtn.addEventListener('click', () => {
      bonesVisible = !bonesVisible;
      if (skeletonHelper) {
        skeletonHelper.visible = bonesVisible;
        console.log(`ボーン表示: ${bonesVisible ? 'オン' : 'オフ'}`);
      } else {
        console.log('スケルトンヘルパーが初期化されていません');
      }
    });
    
    // 初期状態では無効化
    toggleBonesBtn.disabled = true;
    toggleBonesBtn.style.opacity = 0.5;
  }

  // カメラリセットボタン
  if (resetCamera) {
    resetCamera.addEventListener('click', () => {
      if (currentModel) {
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(
          center.x + maxDim * 0.8,  // 2.0から0.8に変更して近づける
          Math.max(maxDim, size.y) * 0.7,  // 1.5から0.7に変更して近づける
          center.z + maxDim * 0.8   // 2.0から0.8に変更して近づける
        );
        camera.lookAt(center);
        controls.target.copy(center);
        console.log('カメラ位置をリセットしました');
      } else {
        // モデルがロードされていない場合は初期位置に戻す
        camera.position.set(50, 50, 50);  // 初期位置も近づける
        controls.target.set(0, 0, 0);
        console.log('カメラを初期位置にリセットしました');
      }
      controls.update();
    });
  }

  // グリッド表示ボタン
  if (toggleGridBtn) {
    toggleGridBtn.addEventListener('click', () => {
      gridVisible = !gridVisible;
      if (grid) {
        grid.visible = gridVisible;
        console.log(`グリッド表示: ${gridVisible ? 'オン' : 'オフ'}`);
      } else {
        console.log('グリッドが初期化されていません');
      }
    });
  }

  console.log('FBXビューアが正常に初期化されました');

  // デフォルトモデル（X Bot.fbx）の自動読み込み
  const loadDefaultModel = () => {
    console.log('デフォルトモデルを読み込みます: X Bot.fbx');
    
    // VRMモデル変数をリセット
    vrmModel = null;
    
    // FBXLoaderを作成
    const loader = new FBXLoader();
    
    // X Bot.fbxを読み込む
    loader.load(
      'X Bot.fbx', // モデルファイルのパス
      (object) => {
        // モデルロード成功時の処理
        console.log('デフォルトモデルのロードに成功しました');
        
        // 現在のモデルとスケルトンヘルパーをクリア
        if (currentModel) {
          scene.remove(currentModel);
        }
        
        if (skeletonHelper) {
          scene.remove(skeletonHelper);
          skeletonHelper = null;
        }
        
        // アニメーション関連の変数をリセット
        if (mixer) {
          mixer = null;
          animations = [];
          animationAction = null;
          isAnimating = false;
          
          // ボタンを無効化
          playAnimationBtn.disabled = true;
          stopAnimationBtn.disabled = true;
          
          // クラスを削除
          playAnimationBtn.classList.remove('active');
          stopAnimationBtn.classList.remove('active');
        }
        
        // メッシュ表示状態をリセット（初期状態は表示）
        meshVisible = true;
        
        // アニメーションミキサーの作成
        mixer = new THREE.AnimationMixer(object);
        
        // モデルのスケールを元のサイズに設定
        object.scale.set(1.0, 1.0, 1.0);
        console.log('デフォルトモデルのスケールを元のサイズに設定しました');
        
        // モデル内の既存アニメーションを探す
        if (object.animations && object.animations.length > 0) {
          console.log(`モデルに ${object.animations.length} 個のアニメーションが含まれています`);
          animations = object.animations;
          
          // モデル内蔵アニメーションがある場合、その情報を表示
          currentAnimationFileName = 'モデル内蔵アニメーション';
          
          // アニメーションボタンを有効化
          playAnimationBtn.disabled = false;
          stopAnimationBtn.disabled = false;
        } else {
          console.log('モデルにアニメーションは含まれていません');
        }
        
        // モデルのバウンディングボックスを計算して中心と大きさを取得
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // モデルをY軸方向に少し持ち上げてグリッドの上に配置
        object.position.set(0, size.y / 2 * 0.01, 0);
        
        // モデルの元の位置を保存（必ず位置設定後に保存）
        originalModelPosition.copy(object.position);
        console.log('デフォルトモデルの元の位置を保存:', originalModelPosition);
        
        // モデルをシーンに追加
        scene.add(object);
        currentModel = object;
        console.log('デフォルトモデルを設定しました:', currentModel);
        
        // モデル内のボーン・スケルトンを探索
        let skeletonsFound = false;
        const findSkeletons = (obj) => {
          if (obj.isSkinnedMesh) {
            console.log(`スキンメッシュを検出: ${obj.name || 'unnamed'}`);
            skeletonsFound = true;
            return true;
          }

          if (obj.isBone) {
            console.log(`ボーンを検出: ${obj.name || 'unnamed'}`);
            skeletonsFound = true;
            return true;
          }
          
          if (obj.children && obj.children.length > 0) {
            for (let child of obj.children) {
              if (findSkeletons(child)) {
                return true;
              }
            }
          }
          
          return false;
        };
        
        // モデル内のボーン・スケルトンを探索
        findSkeletons(object);
        
        // スケルトンヘルパーを作成
        skeletonHelper = new THREE.SkeletonHelper(object);
        
        // ボーン表示ボタンの有効化/無効化
        if (toggleBonesBtn) {
          if (skeletonsFound) {
            toggleBonesBtn.disabled = false;
            toggleBonesBtn.style.opacity = 1;
            console.log('ボーン表示ボタンを有効化しました');
            
            // ボーン付きモデルの場合、デフォルトでボーン表示を有効に
            bonesVisible = true;
            skeletonHelper.visible = true;
          } else {
            toggleBonesBtn.disabled = true;
            toggleBonesBtn.style.opacity = 0.5;
            bonesVisible = false;
            skeletonHelper.visible = false;
          }
        }

        // メッシュ表示ボタンを有効化
        if (toggleMeshBtn) {
          toggleMeshBtn.disabled = false;
          toggleMeshBtn.style.opacity = 1;
        }

        scene.add(skeletonHelper);

        // グリッドを確実に表示
        if (grid) {
          grid.visible = gridVisible;
        }
        
        // モデルの最大サイズを取得
        const maxModelDimension = Math.max(size.x, size.y, size.z);
        
        // グリッドを更新
        updateGrid(maxModelDimension);

        // モデルの中心と大きさを計算し、カメラの位置を調整
        const maxDim = maxModelDimension;
        camera.position.set(
          center.x + maxDim * 0.8,  // 2.0から0.8に変更して近づける
          Math.max(maxDim, size.y) * 0.7,  // 1.5から0.7に変更して近づける
          center.z + maxDim * 0.8   // 2.0から0.8に変更して近づける
        );
        controls.target.copy(center);
        
        // カメラの視野距離を調整
        camera.near = Math.min(0.1, maxDim * 0.01);
        camera.updateProjectionMatrix();
        
        // メッシュ数と頂点数をカウント
        const meshCount = countMeshes(object);
        const vertexCount = countVertices(object);
        const polygonCount = countPolygons(object);
        
        // ファイル名を設定
        currentModelFileName = 'X Bot.fbx';
        
        // モデル情報の表示
        updateModelInfo(0, meshCount, vertexCount, polygonCount);
        
        // スケールバーの表示状態を更新
        updateScaleControlVisibility();
        
        console.log('デフォルトモデルの読み込みが完了しました');
      },
      // 進行状況のコールバック
      (xhr) => {
        if (xhr.total && xhr.total > 0) {
          const percent = (xhr.loaded / xhr.total) * 100;
          console.log(`デフォルトモデルの読み込み: ${percent.toFixed(2)}%`);
        }
      },
      // エラーコールバック
      (err) => {
        console.error('デフォルトモデルのロードに失敗しました:', err);
      }
    );
  };
  
  // デフォルトモデルを読み込む
  loadDefaultModel();

  // スケールバーの初期表示状態を設定
  updateScaleControlVisibility();

  // モデル回転ボタンのイベントリスナー
  if (rotateModelBtn) {
    rotateModelBtn.addEventListener('click', () => {
      if (currentModel && vrmModel) {
        // 現在のY軸回転に180度（π）を加える
        currentModel.rotation.y = (currentModel.rotation.y + Math.PI) % (Math.PI * 2);
        console.log(`モデルを回転しました: ${(currentModel.rotation.y / Math.PI).toFixed(2)}π rad`);
      }
    });
  }

  // カメラアングル切替ボタンのイベントリスナー
  let cameraAngleIndex = 0; // 0: 右斜め前, 1: 左斜め前, 2: 正面
  if (switchCameraBtn) {
    switchCameraBtn.addEventListener('click', () => {
      if (currentModel && vrmModel) {
        // 次のカメラアングルにインデックスを進める
        cameraAngleIndex = (cameraAngleIndex + 1) % 3;
        
        // VRMモデルのスケールを考慮したカメラ距離を計算
        const bbox = new THREE.Box3().setFromObject(currentModel);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaledMaxDim = maxDim * 70; // VRMスケール
        const cameraDistance = scaledMaxDim * 0.9;
        const cameraHeight = scaledMaxDim * 0.6; // 高さをより高く設定
        const targetHeight = scaledMaxDim * 0.4; // 視点も少し上に調整
        
        // カメラの角度（45度）
        const cameraAngle = Math.PI / 4;
        
        switch (cameraAngleIndex) {
          case 0: // 右斜め前
            camera.position.set(
              cameraDistance * Math.sin(cameraAngle),
              cameraHeight,
              -cameraDistance * Math.cos(cameraAngle)
            );
            break;
          case 1: // 左斜め前
            camera.position.set(
              -cameraDistance * Math.sin(cameraAngle),
              cameraHeight,
              -cameraDistance * Math.cos(cameraAngle)
            );
            break;
          case 2: // 正面
            camera.position.set(
              0,
              cameraHeight,
              -cameraDistance
            );
            break;
        }
        
        // カメラの視点を更新
        camera.lookAt(0, targetHeight, 0);
        controls.target.set(0, targetHeight, 0);
        controls.update();
        
        console.log(`カメラアングルを切り替えました: ${['右斜め前', '左斜め前', '正面'][cameraAngleIndex]}`);
      }
    });
  }
});