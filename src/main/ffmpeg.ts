import Ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from '../../resources/ffmpeg.exe?asset&asarUnpack'
Ffmpeg.setFfmpegPath(ffmpegPath)
export default Ffmpeg
