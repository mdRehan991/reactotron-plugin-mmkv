import Reactotron from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';
import { mmkvReactotronPlugin } from '../services/storage';

Reactotron
  .configure({ name: 'MMKV + Redux Example' })
  .useReactNative()
  .use(mmkvReactotronPlugin)
  .use(reactotronRedux())
  .connect();

export default Reactotron;
