import Reactotron from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';
import { basicPlugin, proxyPlugin } from '../services/storage';

Reactotron
  .configure({ name: 'MMKV + Redux Example' })
  .useReactNative()
  .use(basicPlugin)
  .use(proxyPlugin)
  .use(reactotronRedux())
  .connect();

export default Reactotron;
